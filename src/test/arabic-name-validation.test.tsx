import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StudentLogin from "@/pages/StudentLogin";

const rpc           = vi.fn();
const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
const signOut       = vi.fn().mockResolvedValue({ error: null });
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOtp:     (...a: unknown[]) => signInWithOtp(...a),
      signOut:           (...a: unknown[]) => signOut(...a),
      setSession:        vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: (...a: unknown[]) => onAuthStateChange(...a),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    rpc: (...a: unknown[]) => rpc(...a),
  },
}));

vi.mock("@/lib/verifyOtpCode", () => ({
  verifyOtpCode: vi.fn().mockResolvedValue({ data: null, error: { message: "test" } }),
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

// Fill all required signup fields, wait for email check, then submit.
// Returns without reaching OTP screen so the caller can assert on what happened.
async function submitSignupWithName(name: string) {
  rpc.mockResolvedValue({ data: "available", error: null });
  setup();

  fireEvent.click(screen.getByRole("button", { name: /new student/i }));
  fireEvent.change(screen.getByPlaceholderText(/your full name/i), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText(/\+20/i), { target: { value: "+201234567890" } });
  fireEvent.change(screen.getByLabelText(/country/i), { target: { value: "Egypt" } });
  fireEvent.change(screen.getByPlaceholderText(/cairo/i), { target: { value: "Cairo" } });
  fireEvent.change(screen.getByPlaceholderText(/street, building/i), { target: { value: "123 Test Street" } });
  fireEvent.change(screen.getByLabelText(/degree/i), { target: { value: "Bachelor of Physical Therapy" } });
  fireEvent.change(screen.getByLabelText(/german level/i), { target: { value: "A1" } });
  fireEvent.change(screen.getByPlaceholderText(/you@email\.com/i), { target: { value: "u@test.com" } });

  await waitFor(
    () => expect(screen.getByRole("button", { name: /send verification code/i })).not.toBeDisabled(),
    { timeout: 2000 },
  );

  fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: "available", error: null });
});

describe("Signup — Arabic name rejection", () => {
  it("rejects a fully Arabic name with an error toast", async () => {
    await submitSignupWithName("محمد علي");
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Please correct your details",
          description: expect.stringMatching(/English \(Latin\) letters only/i),
          variant: "destructive",
        }),
      ),
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("rejects a name mixing Arabic and Latin characters", async () => {
    await submitSignupWithName("Ahmed محمد");
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Please correct your details",
          description: expect.stringMatching(/English \(Latin\) letters only/i),
          variant: "destructive",
        }),
      ),
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("accepts a fully Latin name and proceeds to send the OTP", async () => {
    await submitSignupWithName("Ahmed Hassan");
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledTimes(1));
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(/English \(Latin\) letters only/i),
      }),
    );
  });
});
