import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SsraLogo from "@/components/ssra/SsraLogo";

const INPUT = "w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]";
const INPUT_PLAIN = "w-full px-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]";

export default function StudentLogin() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const { toast }  = useToast();
  const redirect   = params.get("redirect") ?? "/dashboard";

  const [tab, setTab]         = useState<"login" | "signup">("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // OTP verification step shown after signup
  const [otpStep, setOtpStep]   = useState(false);
  const [otp, setOtp]           = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpFailed, setOtpFailed] = useState(false); // show password fallback

  // If Supabase redirects back with ?code= (PKCE email confirmation link),
  // the client auto-exchanges it; we just need to catch SIGNED_IN and redirect.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        navigate(redirect, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirect]);

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  /* ── Login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Email not confirmed → show OTP step
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setOtpStep(true);
        setResendCooldown(60);
        toast({ title: "Email not confirmed yet", description: "Enter the 6-digit code we sent to your inbox." });
      } else {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    navigate(redirect, { replace: true });
  };

  /* ── Signup ── */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }
    // If Supabase auto-confirms (email confirmation disabled in project settings),
    // a session is returned immediately — redirect directly, no OTP needed.
    if (data.session) {
      navigate(redirect, { replace: true });
      return;
    }
    // Email confirmation enabled → show OTP entry screen
    setOtpStep(true);
    setResendCooldown(60);
  };

  /* ── Verify OTP ── */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    setOtpFailed(false);

    // Try signup type first, then email type as fallback
    const { error: e1 } = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" });
    if (e1) {
      const { error: e2 } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (e2) {
        setOtpLoading(false);
        setOtpFailed(true); // show password fallback option
        toast({
          title: "Code invalid or expired",
          description: "Request a new code, or sign in with your password directly.",
          variant: "destructive",
        });
        return;
      }
    }
    setOtpLoading(false);
    // onAuthStateChange will fire SIGNED_IN → navigate to dashboard
  };

  /* ── Sign in with password (fallback from OTP screen) ── */
  const handlePasswordFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate(redirect, { replace: true });
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtpFailed(false);
    setOtp("");
    await supabase.auth.resend({ type: "signup", email });
    setLoading(false);
    setResendCooldown(60);
    toast({ title: "New code sent!", description: "Check your inbox — use it within 10 minutes." });
  };

  /* ── Reset password ── */
  const handleReset = async () => {
    if (!email) { toast({ title: "Enter your email first", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setResetSent(true);
  };

  /* ── OTP step UI ── */
  if (otpStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8">
            <SsraLogo size={36} scheme="dark" />
          </Link>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Check your email</h2>
                <p className="text-xs text-slate-400 mt-0.5">Code sent to <span className="font-medium text-slate-600">{email}</span></p>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enter the <strong>6-digit code</strong> from the email. It expires in 10 minutes.
              You can also click the link in the email directly.
            </p>

            {/* OTP form */}
            {!otpFailed ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpFailed(false); }}
                    placeholder="123456"
                    className="w-full px-4 h-14 rounded-xl border border-slate-200 text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={otpLoading || otp.length < 6}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  {otpLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Verify & Sign In</>}
                </button>
              </form>
            ) : (
              /* Password fallback — shown after OTP fails */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed">
                  Code expired or invalid. Enter your password to sign in directly, or request a new code.
                </div>
                <form onSubmit={handlePasswordFallback} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={show ? "text" : "password"} value={password}
                        onChange={(e) => setPassword(e.target.value)} required
                        placeholder="Your password"
                        className="w-full pl-10 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                      <button type="button" onClick={() => setShow(!show)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In with Password"}
                  </button>
                </form>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={() => { setOtpStep(false); setOtp(""); }}
                className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className={`transition-colors ${resendCooldown > 0 ? "text-slate-300 cursor-not-allowed" : "text-[hsl(220,91%,54%)] hover:underline"}`}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <Link to="/" className="hover:text-slate-600 transition-colors">← Back to homepage</Link>
          </p>
        </div>
      </div>
    );
  }

  /* ── Main login/signup UI ── */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <SsraLogo size={36} scheme="dark" />
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setResetSent(false); }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "text-[hsl(220,91%,54%)] border-b-2 border-[hsl(220,91%,54%)] bg-[hsl(220,91%,54%)]/4"
                    : "text-slate-500 hover:text-slate-800"
                }`}>
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="you@email.com" className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={show ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} required
                      placeholder="••••••••" className="w-full pl-10 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </button>
                <div className="text-center mt-3">
                  {resetSent ? (
                    <span className="text-xs text-emerald-600">Reset email sent — check your inbox.</span>
                  ) : (
                    <button type="button" onClick={handleReset}
                      className="text-xs text-slate-400 hover:text-[hsl(220,91%,54%)] transition-colors">
                      Forgot your password?
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                    placeholder="Your full name" className={INPUT_PLAIN} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    placeholder="you@email.com" className={INPUT_PLAIN} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} required
                      placeholder="Min. 8 characters"
                      className="w-full px-4 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Free Account"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  By signing up you agree to our{" "}
                  <Link to="/legal" className="underline">Terms & Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/" className="hover:text-slate-600 transition-colors">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
}
