import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const navigate    = useNavigate();
  const { toast }   = useToast();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [ready,    setReady]    = useState(false);

  // Supabase sends the user to /#access_token=...&type=recovery
  // The onAuthStateChange event "PASSWORD_RECOVERY" fires when this is detected
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" }); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" }); return;
    }
    setDone(true);
    toast({ title: "Password updated successfully" });
    setTimeout(() => navigate("/dashboard"), 2000);
  }

  const inputClass = "w-full pl-10 pr-10 h-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]";

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
          <div className="px-8 pt-7 pb-2">
            <h1 className="font-display text-xl font-bold text-slate-900">
              {done ? "Password Updated" : "Set New Password"}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {done ? "You'll be redirected to your dashboard shortly." : "Enter your new password below."}
            </p>
          </div>

          <div className="p-8 pt-5">
            {done ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="text-slate-600 text-sm">Redirecting to dashboard…</p>
              </div>
            ) : !ready ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(220,91%,54%)] mx-auto mb-3" />
                <p className="text-sm text-slate-400">Verifying reset link…</p>
                <p className="text-xs text-slate-300 mt-2">
                  If this persists,{" "}
                  <Link to="/login" className="text-[hsl(220,91%,54%)] hover:underline">
                    request a new reset link.
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" required className={inputClass} />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat your password" required className={inputClass} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/login" className="hover:text-slate-600 transition-colors">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
