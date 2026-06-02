import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentLogin from "./StudentLogin";

/* ── Mocks ── */
const signOut       = vi.fn().mockResolvedValue({ error: null });
const setSession    = vi.fn().mockResolvedValue({ error: null });
const functionsInvoke = vi.fn();
const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

// Chainable query builder: .from().update().eq() / .select().eq().maybeSingle()
const eqUpdate     = vi.fn();
const eqSelect     = vi.fn();
const maybeSingle  = vi.fn();
const updateFn     = vi.fn(() => ({ eq: eqUpdate }));
const selectFn     = vi.fn(() => ({ eq: eqSelect }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      setSession:         (...a: unknown[]) => setSession(...a),
      signInWithOtp:      (...a: unknown[]) => signInWithOtp(...a),
      signOut:            (...a: unknown[]) => signOut(...a),
      onAuthStateChange:  (...a: unknown[]) => onAuthStateChange(...a),
    },
    functions: {
      invoke:             (...a: unknown[]) => functionsInvoke(...a),
    },
    from: vi.fn(() => ({ update: updateFn, select: selectFn })),
  },
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

async function reachOtpScreen(tab: "signup" | "login", name = "Test User") {
  setup();
  if (tab === "signup") {
    fireEvent.click(screen.getByRole("button", { name: /new student/i }));
    fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: name } });
  }
  fireEvent.change(screen.getByPlaceholderText(/you@email\.com/i), { target: { value: "u@test.com" } });
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
  functionsInvoke.mockResolvedValue({ data: { user: { id: "u-1" }, session: { access_token: "token", refresh_token: "refresh" } }, error: null });
});

describe("StudentLogin — OTP verify hardening", () => {
  /* ─── SIGNUP ─── */
  it("signup: stores name + reads back successfully → no sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });               // update
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "Test User" }, error: null }); // read-back
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
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Registration failed", variant: "destructive",
    }));
  });

  it("signup: read-back returns empty name → sign-out", async () => {
    eqUpdate.mockResolvedValueOnce({ error: null });
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "" }, error: null });
    await reachOtpScreen("signup");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Verification failed", variant: "destructive",
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
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Verification failed", variant: "destructive",
    }));
  });

  /* ─── LOGIN ─── */
  it("login: profile has name → allowed, no sign-out", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "Existing User" }, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("login: profile missing → immediate sign-out", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Account not registered", variant: "destructive",
    }));
  });

  it("login: profile has empty name → sign-out", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { full_name: "   " }, error: null });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  /* ─── OTP itself fails ─── */
  it("invalid OTP → no sign-out, no profile queries", async () => {
    functionsInvoke.mockResolvedValueOnce({ data: null, error: { message: "bad code" } });
    await reachOtpScreen("login");
    await submitOtp();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Invalid or expired code",
    })));
    expect(signOut).not.toHaveBeenCalled();
    expect(maybeSingle).not.toHaveBeenCalled();
  });
});
