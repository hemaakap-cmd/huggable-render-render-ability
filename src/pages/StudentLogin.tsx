import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, ArrowLeft, User, Phone, Globe, GraduationCap, Languages, MapPin, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SsraLogo from "@/components/ssra/SsraLogo";
import BackButton from "@/components/ssra/BackButton";
import { verifyOtpCode } from "@/lib/verifyOtpCode";
import { isProfileComplete, missingProfileFields } from "@/lib/profileCompletion";

type Tab = "signup" | "login";

const COUNTRIES = [
  "Egypt", "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Jordan", "Morocco",
  "Algeria", "Tunisia", "Iraq", "Lebanon", "Syria", "Sudan", "Libya",
  "Germany", "Austria", "Switzerland", "Other",
];
const DEGREES = [
  "Bachelor of Physical Therapy",
  "Bachelor of Sport Science",
  "Bachelor of Medicine",
  "Bachelor of Pharmacy",
  "Bachelor of Nursing",
  "Other",
];
const GERMAN_LEVELS = ["None / A0", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function StudentLogin() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { toast, dismiss } = useToast();
  const redirect  = params.get("redirect") ?? "/dashboard";

  const [tab, setTab]       = useState<Tab>("login");
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity]       = useState("");
  const [address, setAddress] = useState("");
  const [degree, setDegree] = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP step
  const [otpStep, setOtpStep]           = useState(false);
  const [otp, setOtp]                   = useState("");
  const [otpLoading, setOtpLoading]     = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Live email existence check
  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "exists" | "available" | "invalid">("idle");
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isValid) {
      setEmailCheckStatus(trimmed.length > 0 ? "invalid" : "idle");
      return;
    }
    setEmailCheckStatus("checking");
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("ssra_profiles")
        .select("id")
        .eq("email", trimmed)
        .maybeSingle();
      setEmailCheckStatus(data ? "exists" : "available");
    }, 500);
    return () => clearTimeout(handle);
  }, [email]);

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
    setPhone("");
    setCountry("");
    setCity("");
    setAddress("");
    setDegree("");
    setGermanLevel("");
    setOtpStep(false);
    setOtp("");
  };

  /* ── Send OTP ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    dismiss();
    const normalizedEmail = email.trim().toLowerCase();
    if (tab === "signup") {
      if (!name.trim()) {
        toast({ title: "Please enter your full name", variant: "destructive" });
        return;
      }
      if (!phone.trim() || phone.trim().length < 6) {
        toast({ title: "Please enter a valid phone number", variant: "destructive" });
        return;
      }
      if (!country) {
        toast({ title: "Please select your country", variant: "destructive" });
        return;
      }
      if (!city.trim()) {
        toast({ title: "Please enter your city", variant: "destructive" });
        return;
      }
      if (!address.trim() || address.trim().length < 5) {
        toast({ title: "Please enter your full address", variant: "destructive" });
        return;
      }
      if (!degree) {
        toast({ title: "Please select your degree", variant: "destructive" });
        return;
      }
      if (!germanLevel) {
        toast({ title: "Please select your German level", variant: "destructive" });
        return;
      }
      // Prevent duplicate registration
      const { data: existingProfile } = await supabase
        .from("ssra_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (existingProfile) {
        toast({
          title: "Email already registered",
          description: "This email already has an account. Please switch to Sign In.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { data: existingProfile } = await supabase
        .from("ssra_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (!existingProfile) {
        toast({
          title: "Account not found",
          description: "This email is not registered. Please register first from New Student.",
          variant: "destructive",
        });
        return;
      }
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: tab === "signup",
        data: tab === "signup" ? { full_name: name.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    setLoading(false);
    if (error) {
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
    dismiss();
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setOtpLoading(true);
    const { data: verifyData, error } = await verifyOtpCode({ email, token: otp, type: tab === "signup" ? "signup" : "magiclink" });
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
      // Guard: if this email already has a completed profile, refuse to overwrite
      const { data: profCheck } = await supabase
        .from("ssra_profiles")
        .select("phone_number, country, degree, german_level")
        .eq("id", userId)
        .maybeSingle();

      if (profCheck && (profCheck.phone_number || profCheck.country || profCheck.degree || profCheck.german_level)) {
        setOtpLoading(false);
        toast({
          title: "Account already exists",
          description: "This email already has an account. Please use Sign In instead.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setOtpStep(false);
        return;
      }

      // Save all profile data collected before OTP
      const { error: upErr } = await supabase
        .from("ssra_profiles")
        .update({
          full_name: name.trim(),
          email,
          phone_number: phone.trim(),
          country,
          city: city.trim(),
          address: address.trim(),
          degree,
          german_level: germanLevel,
        } as any)
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

      const { data: confirmRow, error: confirmErr } = await supabase
        .from("ssra_profiles")
        .select("full_name, phone_number, country, city, address, degree, german_level")
        .eq("id", userId)
        .maybeSingle();
      if (confirmErr || !isProfileComplete(confirmRow)) {
        await supabase.auth.signOut();
        setOtpLoading(false);
        const missing = missingProfileFields(confirmRow).join(", ");
        toast({
          title: "Registration incomplete",
          description: `These fields are required: ${missing}. Please try again.`,
          variant: "destructive",
        });
        setOtpStep(false);
        return;
      }
    } else {
      const { data: prof } = await supabase
        .from("ssra_profiles")
        .select("full_name, phone_number, country, degree, german_level")
        .eq("id", userId)
        .maybeSingle();
      if (!isProfileComplete(prof)) {
        // Allow them through — the global RequireAuth gate will redirect them to /complete-profile
        // so they can finish, then continue. This avoids dead-ends for users mid-registration.
      }
    }


    setOtpLoading(false);
    navigate(redirect, { replace: true });
  };


  /* ── Resend ── */
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    dismiss();
    setLoading(true);
    setOtp("");
    const normalizedEmail = email.trim().toLowerCase();
    if (tab === "signup") {
      const { data: existingProfile } = await supabase
        .from("ssra_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (existingProfile) {
        setLoading(false);
        toast({
          title: "Email already registered",
          description: "This email already has an account. Please switch to Sign In.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { data: existingProfile } = await supabase
        .from("ssra_profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (!existingProfile) {
        setLoading(false);
        toast({
          title: "Account not found",
          description: "This email is not registered. Please register first from New Student.",
          variant: "destructive",
        });
        return;
      }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: tab === "signup",
        data: tab === "signup" ? { full_name: name.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't resend", description: error.message, variant: "destructive" });
      return;
    }
    setResendCooldown(60);
    toast({ title: "New code sent!", description: "Check your inbox — valid for 10 minutes." });
  };

  /* ═══════ OTP SCREEN ═══════ */
  if (otpStep) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <BackButton className="mb-4" />
          <h1 className="sr-only">Student Portal — verify email</h1>
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
                <p className="text-xs text-slate-400 mt-0.5">
                  Code sent to <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enter the <strong>6-digit code</strong> from the email.
              Valid for <strong>10 minutes</strong> — or click the link in the email directly.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <label htmlFor="student-otp" className="sr-only">6-digit verification code</label>
              <input
                id="student-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  dismiss();
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                }}
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
                  : <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Complete Registration</>}
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

  /* ═══════ EMAIL / DETAILS SCREEN ═══════ */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <BackButton className="mb-4" />
        <h1 className="sr-only">Student Portal — sign in or register</h1>
        <Link to="/" className="flex items-center justify-center mb-8">
          <SsraLogo size={36} scheme="dark" />
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {([
              { key: "login",  label: "Sign In",     sub: "Already have an account" },
              { key: "signup", label: "New Student", sub: "Create a free account"   },
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
            {tab === "signup" && (
              <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 leading-relaxed">
                Fill in all your details below. A 6-digit verification code will be sent to your email to complete registration.
              </p>
            )}

            <form onSubmit={handleSendCode} className="space-y-4">

              {tab === "signup" && (
                <>
                  <div>
                    <label htmlFor="signup-name" className="text-sm font-medium text-slate-700 block mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your full name"
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-phone" className="text-sm font-medium text-slate-700 block mb-1.5">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="+20 1XX XXX XXXX"
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-country" className="text-sm font-medium text-slate-700 block mb-1.5">Country *</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="signup-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      >
                        <option value="">Select country…</option>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-city" className="text-sm font-medium text-slate-700 block mb-1.5">City *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        id="signup-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="e.g. Cairo"
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-address" className="text-sm font-medium text-slate-700 block mb-1.5">Full Address *</label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        id="signup-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        required
                        maxLength={300}
                        rows={2}
                        placeholder="Street, building, apartment…"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] resize-none"
                      />
                    </div>
                  </div>


                  <div>
                    <label htmlFor="signup-degree" className="text-sm font-medium text-slate-700 block mb-1.5">Degree / Qualification *</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="signup-degree"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      >
                        <option value="">Select degree…</option>
                        {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-german-level" className="text-sm font-medium text-slate-700 block mb-1.5">German Level *</label>
                    <div className="relative">
                      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="signup-german-level"
                        value={germanLevel}
                        onChange={(e) => setGermanLevel(e.target.value)}
                        required
                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                      >
                        <option value="">Select German level…</option>
                        {GERMAN_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="login-email" className="text-sm font-medium text-slate-700 block mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@email.com"
                    autoFocus={tab === "login"}
                    className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
                  />
                </div>
                {emailCheckStatus === "checking" && (
                  <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking email…
                  </p>
                )}
                {emailCheckStatus === "exists" && tab === "signup" && (
                  <p className="mt-1.5 text-xs text-red-600">
                    This email is already registered. Switch to <button type="button" onClick={() => switchTab("login")} className="underline font-medium">Sign In</button>.
                  </p>
                )}
                {emailCheckStatus === "available" && tab === "login" && (
                  <p className="mt-1.5 text-xs text-red-600">
                    No account found. Switch to <button type="button" onClick={() => switchTab("signup")} className="underline font-medium">New Student</button> to register.
                  </p>
                )}
                {emailCheckStatus === "available" && tab === "signup" && (
                  <p className="mt-1.5 text-xs text-emerald-600">✓ Email is available</p>
                )}
                {emailCheckStatus === "exists" && tab === "login" && (
                  <p className="mt-1.5 text-xs text-emerald-600">✓ Account found</p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading || !email ||
                  emailCheckStatus === "checking" ||
                  emailCheckStatus === "invalid" ||
                  (tab === "signup" && emailCheckStatus === "exists") ||
                  (tab === "login" && emailCheckStatus === "available")
                }
                className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code…</>
                  : <><Mail className="w-4 h-4" /> {tab === "signup" ? "Continue — Send Verification Code" : "Send Verification Code"}</>}
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
