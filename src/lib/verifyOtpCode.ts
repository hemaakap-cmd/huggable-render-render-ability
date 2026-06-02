type VerifyOtpCodeParams = {
  email: string;
  token: string;
  type: "signup" | "magiclink";
};

export async function verifyOtpCode({ email, token, type }: VerifyOtpCodeParams) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ email, token, type }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    return {
      data: null,
      error: new Error(data?.error || "Verification server did not accept the code."),
    };
  }

  return { data, error: null };
}