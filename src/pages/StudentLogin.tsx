import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Mail, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function StudentLogin() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const { toast }   = useToast();
  const redirect    = params.get("redirect") ?? "/dashboard";

  const [tab, setTab]         = useState<"login" | "signup">("login");
  const [email, setEmail]     = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (mode: "login" | "signup") => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === "signup",
        data: mode === "signup" ? { full_name: name } : undefined,
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      // friendlier message when user tries to sign in without an account
      if (mode === "login" && /signups not allowed|not.*found|user not found/i.test(error.message)) {
        toast({
          title: "No account found",
          description: "Please create an account first.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Couldn't send code", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a 6-digit code.",
    });
    navigate(`/verify-otp?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}&mode=${mode}`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    sendCode("login");
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name.trim()) {
      toast({ title: "Please enter your name and email", variant: "destructive" });
      return;
    }
    sendCode("signup");
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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "text-[hsl(220,91%,54%)] border-b-2 border-[hsl(220,91%,54%)] bg-[hsl(220,91%,54%)]/4"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Enter your email and we'll send you a 6-digit login code.
                </p>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="you@email.com"
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Login Code"}
                </button>
                <p className="text-center text-xs text-slate-400 mt-2">
                  No account yet?{" "}
                  <button type="button" onClick={() => setTab("signup")} className="text-[hsl(220,91%,54%)] font-semibold hover:underline">
                    Create one
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Sign up with just your email — we'll send you a 6-digit code to verify.
                </p>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="you@email.com"
                      className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Verification Code"}
                </button>
                <p className="text-center text-xs text-slate-400">
                  By signing up you agree to our{" "}
                  <Link to="/about" className="underline">Terms & Privacy Policy</Link>.
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
