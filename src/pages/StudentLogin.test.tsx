import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentLogin from "./StudentLogin";

/* ── Mocks ── */
const signOut       = vi.fn().mockResolvedValue({ error: null });
const setSession    = vi.fn().mockResolvedValue({ error: null });
const verifyOtpCode = vi.fn();
const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

// Chainable query builder
const eqUpdate     = vi.fn();
const eqSelect     = vi.fn();
const maybeSingle  = vi.fn();
const updateFn     = vi.fn(() => ({ eq: eqUpdate }));
const selectFn     = vi.fn(() => ({ eq: eqSelect }));
const rpc          = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      setSession:         (...a: unknown[]) => setSession(...a),
      signInWithOtp:      (...a: unknown[]) => signInWithOtp(...a),
      signOut:            (...a: unknown[]) => signOut(...a),
      onAuthStateChange:  (...a: unknown[]) => onAuthStateChange(...a),
    },
    from: vi.fn(() => ({ update: updateFn, select: selectFn })),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));

vi.mock("@/lib/verifyOtpCode", () => ({
  verifyOtpCode: (...a: unknown[]) => verifyOtpCode(...a),
}));

const toast = vi.fn();
const dismiss = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast, dismiss }) }));

function setup() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <StudentLogin />
    </MemoryRouter>
  );
}

function pickFirstOption(el: HTMLSelectElement) {
  const opt = Array.from(el.options).find((o) => o.value && o.value !== "");
  if (opt) fireEvent.change(el, { target: { value: opt.value } });
}

async function reachOtpScreen(tab: "signup" | "login", name = "Test User") {
  setup();
  if (tab === "signup") {
    fireEvent.click(screen.getByRole("button", { name: /new student/i }));
    rpc.mockResolvedValue({ data: "available", error: null });
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: name } });
    fireEvent.change(screen.getByPlaceholderText(/\+20/i), { target: { value: "+201234567890" } });
    pickFirstOption(screen.getByLabelText(/country/i) as HTMLSelectElement);
    fireEvent.change(screen.getByPlaceholderText(/cairo/i), { target: { value: "Cairo" } });
    fireEvent.change(screen.getByPlaceholderText(/street, building/i), { target: { value: "123 Main Street, Apt 4" } });
    pickFirstOption(screen.getByLabelText(/degree/i) as HTMLSelectElement);
    pickFirstOption(screen.getByLabelText(/german level/i) as HTMLSelectElement);
  } else {
    rpc.mockResolvedValue({ data: "registered", error: null });
  }
  fireEvent.change(screen.getByPlaceholderText(/you@email\.com/i), { target: { value: "u@test.com" } });
  // The submit button is disabled while the debounced email check is in flight (500ms).
  // Wait for it to settle so clicking actually submits.
  const submitBtn = screen.getByRole("button", { name: /send verification code/i });
  await waitFor(() => expect(submitBtn).not.toBeDisabled(), { timeout: 4000 });
  fireEvent.click(submitBtn);
  await waitFor(() => expect(screen.getByPlaceholderText(/• • • • • •/)).toBeInTheDocument(), { timeout: 4000 });
  fireEvent.change(screen.getByPlaceholderText(/• • • • • •/), { target: { value: "123456" } });
}

async function submitOtp() {
  fireEvent.click(screen.getByRole("button", { name: /^confirm/i }));
}

const completeProfile = {
  full_name: "Test User",
  phone_number: "+201234567890",
  country: "Egypt",
  city: "Cairo",
  address: "123 Main Street, Apt 4",
  degree: "MD",
  german_level: "B1",
};

beforeEach(() => {
  vi.clearAllMocks();
  eqUpdate.mockReset();
  eqSelect.mockReset();
  maybeSingle.mockReset();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "available", error: null });
  eqSelect.mockReturnValue({ maybeSingle });
  verifyOtpCode.mockResolvedValue({
    data: { user: { id: "u-1" }, session: { access_token: "token", refresh_token: "refresh" } },
    error: null,
  });
});

describe("StudentLogin — OTP verify contract", () => {
  /* ─── SIGNUP ─── */
  it("signup: update + complete read-back → setSession, no sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: completeProfile, error: null });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(eqUpdate).toHaveBeenCalled());
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(setSession).toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("signup: profile update fails → sign-out + 'Registration failed' toast", async () => {
    eqUpdate.mockResolvedValueOnce({ error: { message: "rls" } });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Registration failed", variant: "destructive",
    }));
  });

  it("signup: read-back is incomplete → sign-out + 'Registration incomplete' toast", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "Test User" }, error: null }); // missing other fields
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Registration incomplete", variant: "destructive",
    }));
  });

  it("signup: read-back returns null row → sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("signup: read-back query errors → sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  /* ─── LOGIN ─── */
  it("login: valid OTP + complete profile → setSession, no sign-out", async () => {
    maybeSingle.mockResolvedValueOnce({ data: completeProfile, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("login: valid OTP + incomplete profile → allowed through (RequireAuth handles redirect)", async () => {
    // Current production behavior: do NOT sign out on incomplete profile;
    // the global guard redirects to /complete-profile.
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  /* ─── OTP itself fails ─── */
  it("invalid OTP → no sign-out, no profile queries, error toast", async () => {
    verifyOtpCode.mockResolvedValueOnce({ data: null, error: { message: "bad code" } });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Invalid or expired code",
    })));
    expect(signOut).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
  });
});
