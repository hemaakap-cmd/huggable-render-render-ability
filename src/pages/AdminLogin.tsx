import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SsraLogo from "@/components/ssra/SsraLogo";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);

  const [otpStep, setOtpStep]       = useState(false);
  const [otp, setOtp]               = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* ── Send OTP (login only — never create new users from this page) ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/ssra-admin`,
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("signups not allowed") || msg.includes("user not found")) {
        toast({
          title: "Access denied",
          description: "This email is not authorized for staff access.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
      return;
    }
    setOtpStep(true);
    setResendCooldown(60);
  };

  /* ── Verify OTP + enforce admin/super_admin role ── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    const { data: verifyData, error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error || !verifyData?.user) {
      setOtpLoading(false);
      toast({
        title: "Invalid or expired code",
        description: "Press 'Resend code' to get a new one.",
        variant: "destructive",
      });
      return;
    }

    // Role gate: must be admin or super_admin
    const { data: prof, error: profErr } = await supabase
      .from("ssra_profiles")
      .select("role")
      .eq("id", verifyData.user.id)
      .maybeSingle();

    if (profErr || !prof || (prof.role !== "admin" && prof.role !== "super_admin")) {
      await supabase.auth.signOut();
      setOtpLoading(false);
      toast({
        title: "Access denied",
        description: "This account does not have staff permissions.",
        variant: "destructive",
      });
      setOtpStep(false);
      setOtp("");
      return;
    }

    setOtpLoading(false);
    navigate("/ssra-admin", { replace: true });
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtp("");
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/ssra-admin` },
    });
    setLoading(false);
    setResendCooldown(60);
    toast({ title: "New code sent!", description: "Check your inbox — valid for 10 minutes." });
  };

  /* ═══════ OTP SCREEN ═══════ */
  if (otpStep) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8">
            <SsraLogo size={36} scheme="light" />
          </Link>
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-white">Staff verification</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Code sent to <span className="font-semibold text-slate-200">{email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                autoFocus
                className="w-full px-4 h-16 rounded-xl bg-slate-950 border-2 border-white/10 text-white text-center text-3xl font-bold tracking-[0.5em] focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={otpLoading || otp.length < 6}
                className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {otpLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Enter</>}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
              <button
                onClick={() => { setOtpStep(false); setOtp(""); }}
                className="flex items-center gap-1 hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className={`transition-colors ${
                  resendCooldown > 0 ? "text-slate-600 cursor-not-allowed" : "text-blue-400 hover:underline font-medium"
                }`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════ EMAIL SCREEN ═══════ */
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <SsraLogo size={36} scheme="light" />
        </Link>

        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-white" />
            <div>
              <h1 className="font-display text-lg font-bold text-white">Staff Login</h1>
              <p className="text-xs text-blue-100 mt-0.5">Restricted to authorized staff only</p>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Staff Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="staff@ssra-academy.de"
                    className="w-full pl-10 pr-4 h-11 rounded-xl bg-slate-950 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2 transition-colors"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                  : <><Lock className="w-4 h-4" /> Send Staff Code</>}
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                Only emails assigned as admin or super-admin can sign in here.
              </p>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link to="/login" className="hover:text-slate-400 transition-colors">← Student login</Link>
        </p>
      </div>
    </div>
  );
}
