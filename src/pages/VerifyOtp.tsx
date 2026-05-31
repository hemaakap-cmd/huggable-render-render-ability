import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CODE_LEN = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const email = params.get("email") ?? "";
  const redirect = params.get("redirect") ?? "/dashboard";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // start cooldown on mount (code was just sent)
  useEffect(() => { setCooldown(RESEND_COOLDOWN); }, []);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < CODE_LEN - 1) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join("").length === CODE_LEN) {
      verify(next.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LEN);
    if (!text) return;
    e.preventDefault();
    const next = Array(CODE_LEN).fill("").map((_, i) => text[i] ?? "");
    setDigits(next);
    if (text.length === CODE_LEN) verify(text);
    else inputs.current[text.length]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = async (code: string) => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      toast({ title: "Invalid code", description: error.message, variant: "destructive" });
      setDigits(Array(CODE_LEN).fill(""));
      inputs.current[0]?.focus();
      return;
    }
    toast({ title: "Verified!", description: "Welcome to SSRA." });
    navigate(redirect, { replace: true });
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
      return;
    }
    setCooldown(RESEND_COOLDOWN);
    toast({ title: "Code sent", description: "Check your email for the new code." });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-slate-900">SSRA</span>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-[hsl(220,91%,54%)]" />
            </div>
          </div>
          <h1 className="text-center text-xl font-bold text-slate-900 mb-2">Verify your email</h1>
          <p className="text-center text-sm text-slate-500 mb-6">
            We sent a 6-digit code to<br />
            <span className="font-semibold text-slate-700">{email}</span>
          </p>

          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                disabled={loading}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
              />
            ))}
          </div>

          {loading && (
            <div className="flex justify-center mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(220,91%,54%)]" />
            </div>
          )}

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-2">Didn't get the code?</p>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || resending}
              className="text-sm font-semibold text-[hsl(220,91%,54%)] disabled:text-slate-400 disabled:cursor-not-allowed hover:underline"
            >
              {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/login" className="hover:text-slate-600">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
