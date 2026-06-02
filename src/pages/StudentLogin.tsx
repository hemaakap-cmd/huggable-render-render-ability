import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SsraLogo from "@/components/ssra/SsraLogo";

type Tab = "signup" | "login";

export default function StudentLogin() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { toast } = useToast();
  const redirect  = params.get("redirect") ?? "/dashboard";

  const [tab, setTab]       = useState<Tab>("login");
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  const [loading, setLoading] = useState(false);

  // OTP step
  const [otpStep, setOtpStep]           = useState(false);
  const [otp, setOtp]                   = useState("");
  const [otpLoading, setOtpLoading]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto-redirect when Supabase detects session (magic link click)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate(redirect, { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirect]);

  // Resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setEmail("");
    setName("");
    setOtpStep(false);
    setOtp("");
  };

  /* ── Send OTP ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "signup" && !name.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: tab === "signup",
        data: tab === "signup" ? { full_name: name.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    setLoading(false);
    if (error) {
      // If user tries to sign in but has no account
      if (error.message.toLowerCase().includes("signups not allowed") || error.message.toLowerCase().includes("user not found")) {
        toast({
          title: "Account not found",
          description: "No account with this email. Please register first.",
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

  /* ── Verify OTP ── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    const { data: verifyData, error } = await supabase.functions.invoke("verify-otp-code", {
      body: { email, token: otp, type: tab === "signup" ? "signup" : "magiclink" },
    });
    if (error || verifyData?.error || !verifyData?.user || !verifyData?.session) {
      setOtpLoading(false);
      toast({
        title: "Invalid or expired code",
        description: verifyData?.error || error?.message || "Press 'Resend code' to get a new one.",
        variant: "destructive",
      });
      return;
    }

    await supabase.auth.setSession(verifyData.session);

    const userId = verifyData.user.id;

    if (tab === "signup") {
      // Ensure profile has the full name. Trigger creates row; we update name.
      const { error: upErr } = await supabase
        .from("ssra_profiles")
        .update({ full_name: name.trim(), email })
        .eq("id", userId);
      if (upErr) {
        await supabase.auth.signOut();
        setOtpLoading(false);
        toast({
          title: "Registration failed",
          description: "Could not save your data. Please try again.",
          variant: "destructive",
        });
        setOtpStep(false);
        return;
      }

      // Explicit read-back: confirm the name actually persisted in DB before allowing entry
      const { data: confirmRow, error: confirmErr } = await supabase
        .from("ssra_profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      if (confirmErr || !confirmRow || !confirmRow.full_name || confirmRow.full_name.trim() === "") {
        await supabase.auth.signOut();
        setOtpLoading(false);
        toast({
          title: "Verification failed",
          description: "Your name could not be confirmed in our records. Please try again.",
          variant: "destructive",
        });
        setOtpStep(false);
        return;
      }
    } else {
      // Login: profile must exist with a non-empty name
      const { data: prof } = await supabase
        .from("ssra_profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      if (!prof || !prof.full_name || prof.full_name.trim() === "") {
        await supabase.auth.signOut();
        setOtpLoading(false);
        toast({
          title: "Account not registered",
          description: "Please use 'New Student' to complete your registration first.",
          variant: "destructive",
        });
        setOtpStep(false);
        setTab("signup");
        return;
      }
    }

    setOtpLoading(false);
    // SIGNED_IN event → navigate
  };

  /* ── Resend ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtp("");
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: tab === "signup",
        data: tab === "signup" ? { full_name: name.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);
    setResendCooldown(60);
    toast({ title: "New code sent!", description: "Check your inbox — valid for 10 minutes." });
  };

  /* ═══════ OTP SCREEN ═══════ */
  if (otpStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8">
            <SsraLogo size={36} scheme="dark" />
          </Link>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Check your email</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Code sent to{" "}
                  <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enter the <strong>6-digit code</strong> from the email.
              Valid for <strong>10 minutes</strong> — or click the link in the email directly.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                autoFocus
                className="w-full px-4 h-16 rounded-xl border-2 border-slate-200 text-center text-3xl font-bold tracking-[0.5em] focus:outline-none focus:border-[hsl(220,91%,54%)] transition-colors"
              />
              <button
                type="submit"
                disabled={otpLoading || otp.length < 6}
                className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                {otpLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                  : <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Enter</>}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
              <button
                onClick={() => { setOtpStep(false); setOtp(""); }}
                className="flex items-center gap-1 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className={`transition-colors ${
                  resendCooldown > 0
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-[hsl(220,91%,54%)] hover:underline font-medium"
                }`}
              >
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

  /* ═══════ EMAIL / NAME SCREEN ═══════ */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <SsraLogo size={36} scheme="dark" />
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {([
              { key: "login",  label: "Sign In",        sub: "Already have an account" },
              { key: "signup", label: "New Student",    sub: "Create a free account"   },
            ] as { key: Tab; label: string; sub: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === key
                    ? "text-[hsl(220,91%,54%)] border-b-2 border-[hsl(220,91%,54%)] bg-[hsl(220,91%,54%)]/4"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-8">
            <form onSubmit={handleSendCode} className="space-y-4">

              {tab === "signup" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@email.com"
                    autoFocus={tab === "login"}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                  : <><Mail className="w-4 h-4" /> Send Verification Code</>}
              </button>

              <p className="text-center text-xs text-slate-400">
                {tab === "signup"
                  ? "A 6-digit code will be sent to your email to confirm your account."
                  : "We'll send a code to your email. No password needed."}
              </p>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/" className="hover:text-slate-600 transition-colors">← Back to homepage</Link>
        </p>
      </div>
    </div>
  );
}
