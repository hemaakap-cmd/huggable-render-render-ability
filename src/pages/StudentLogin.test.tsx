import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentLogin from "./StudentLogin";

/* ── Mocks ── */
const signOut           = vi.fn().mockResolvedValue({ error: null });
const setSession        = vi.fn().mockResolvedValue({ error: null });
const verifyOtpCode     = vi.fn();
const signInWithOtp     = vi.fn().mockResolvedValue({ error: null });
const rpc               = vi.fn();
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

// Chainable query builder: .from().update().eq() / .from().select().eq().maybeSingle()
const eqUpdate    = vi.fn();
const eqSelect    = vi.fn();
const maybeSingle = vi.fn();
const updateFn    = vi.fn(() => ({ eq: eqUpdate }));
const selectFn    = vi.fn(() => ({ eq: eqSelect }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      setSession:        (...a: unknown[]) => setSession(...a),
      signInWithOtp:     (...a: unknown[]) => signInWithOtp(...a),
      signOut:           (...a: unknown[]) => signOut(...a),
      onAuthStateChange: (...a: unknown[]) => onAuthStateChange(...a),
    },
    from: vi.fn(() => ({ update: updateFn, select: selectFn })),
    rpc:  (...a: unknown[]) => rpc(...a),
  },
}));

vi.mock("@/lib/verifyOtpCode", () => ({
  verifyOtpCode: (...a: unknown[]) => verifyOtpCode(...a),
}));

const toast   = vi.fn();
const dismiss = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast, dismiss }) }));

function setup() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <StudentLogin />
    </MemoryRouter>,
  );
}

// Fill all required fields for the given tab, wait for the email check debounce
// to resolve so the submit button is enabled, then advance to the OTP screen.
async function reachOtpScreen(tab: "signup" | "login", name = "Test User") {
  rpc.mockResolvedValue({ data: tab === "signup" ? "available" : "registered", error: null });
  setup();

  if (tab === "signup") {
    fireEvent.click(screen.getByRole("button", { name: /new student/i }));
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: name } });
    fireEvent.change(screen.getByPlaceholderText(/\+20/i), { target: { value: "+201234567890" } });
    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: "Egypt" } });
    fireEvent.change(screen.getByPlaceholderText(/cairo/i), { target: { value: "Cairo" } });
    fireEvent.change(screen.getByPlaceholderText(/street, building/i), { target: { value: "123 Test Street" } });
    fireEvent.change(screen.getByLabelText(/degree/i), { target: { value: "Bachelor of Physical Therapy" } });
    fireEvent.change(screen.getByLabelText(/german level/i), { target: { value: "A1" } });
  }

  fireEvent.change(screen.getByPlaceholderText(/you@email\.com/i), { target: { value: "u@test.com" } });

  // Email check debounces 500 ms — wait until the button leaves the "checking" state
  await waitFor(
    () => expect(screen.getByRole("button", { name: /send verification code/i })).not.toBeDisabled(),
    { timeout: 2000 },
  );

  fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
  await waitFor(() => expect(screen.getByPlaceholderText(/• • • • • •/)).toBeInTheDocument());
  fireEvent.change(screen.getByPlaceholderText(/• • • • • •/), { target: { value: "123456" } });
}

async function submitOtp() {
  fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  eqUpdate.mockReset();
  eqSelect.mockReset();
  maybeSingle.mockReset();
  eqSelect.mockReturnValue({ maybeSingle });
  verifyOtpCode.mockResolvedValue({
    data: { user: { id: "u-1" }, session: { access_token: "token", refresh_token: "refresh" } },
    error: null,
  });
  rpc.mockResolvedValue({ data: "available", error: null });
});

describe("StudentLogin — OTP verify hardening", () => {
  /* ─── SIGNUP ─── */

  it("signup: stores profile + reads back successfully → no sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({
      data: {
        full_name: "Test User", phone_number: "+201234567890",
        country: "Egypt", city: "Cairo", address: "123 Test Street",
        degree: "Bachelor of Physical Therapy", german_level: "A1",
      },
      error: null,
    });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(eqUpdate).toHaveBeenCalled());
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signup: update fails → immediate sign-out + error toast", async () => {
    eqUpdate.mockResolvedValueOnce({ error: { message: "rls" } });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Registration failed", variant: "destructive" }),
    );
  });

  it("signup: read-back returns incomplete profile → sign-out + incomplete toast", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "" }, error: null });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Registration incomplete", variant: "destructive" }),
    );
  });

  it("signup: read-back returns null row → sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("signup: read-back query errors → sign-out + incomplete toast", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Registration incomplete", variant: "destructive" }),
    );
  });

  /* ─── LOGIN ─── */

  it("login: complete profile → allowed, no sign-out", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "Existing User" }, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("login: profile missing → allowed through (profile gate handles redirect)", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("login: profile has empty name → allowed through (profile gate handles redirect)", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "   " }, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  /* ─── OTP itself fails ─── */

  it("invalid OTP → no sign-out, no profile queries", async () => {
    verifyOtpCode.mockResolvedValueOnce({ data: null, error: { message: "bad code" } });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Invalid or expired code" }),
      ),
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
