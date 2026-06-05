import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Crown, CheckCircle2, XCircle, Clock, AlertCircle,
  ExternalLink, Loader2, ArrowRight,
} from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMySubscription } from "@/hooks/useSsraData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  active:     { label: "Active",     icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  trialing:   { label: "Trial",      icon: Clock,        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  past_due:   { label: "Past Due",   icon: AlertCircle,  cls: "bg-red-50 text-red-700 border-red-200" },
  canceled:   { label: "Canceled",   icon: XCircle,      cls: "bg-slate-100 text-slate-500 border-slate-200" },
  incomplete: { label: "Incomplete", icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function MySubscription() {
  const { data: subscription, isLoading } = useMySubscription();
  const { toast }                         = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const hasActiveSub = subscription?.status === "active" || subscription?.status === "trialing";
  const statusCfg    = subscription ? (STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.incomplete) : null;

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: window.location.href },
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("No portal URL returned.");
    } catch (err: unknown) {
      toast({ title: "Could not open billing portal", description: (err as Error).message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Subscription</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your Medical German subscription.</p>
        </div>

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
          </div>
        ) : hasActiveSub && subscription ? (
          <>
            {/* Active subscription card */}
            <div className="bg-gradient-to-br from-[hsl(222,47%,9%)] to-[hsl(220,60%,18%)] rounded-2xl p-7 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-[hsl(43,96%,50%)]" />
                <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Active Plan</span>
              </div>
              <div className="font-display text-2xl font-bold mb-1">{(subscription as any).ssra_courses?.title ?? "Medical German"}</div>
              <div className="text-white/50 text-sm mb-6">Monthly subscription · €{(subscription as any).ssra_courses?.price_eur ?? 29}/month</div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/8 rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-1">Status</div>
                  {statusCfg && (
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                      <statusCfg.icon className="w-3 h-3" /> {statusCfg.label}
                    </div>
                  )}
                </div>
                <div className="bg-white/8 rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-1">Next Renewal</div>
                  <div className="text-sm font-semibold text-white">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </div>
                </div>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="bg-red-500/15 border border-red-500/20 rounded-xl p-3 mb-4 text-xs text-red-300">
                  Your subscription will cancel at the end of this period and won't renew.
                </div>
              )}

              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-60">
                {portalLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening portal…</>
                  : <><ExternalLink className="w-4 h-4" /> Manage Billing at paddle.net</>}
              </button>
              <p className="text-xs text-white/30 text-center mt-2">Update card, cancel subscription, or download invoices</p>
            </div>

            {/* Help info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">Need help?</h3>
              <div className="text-xs text-slate-500 space-y-1.5">
                <p>• To <strong>cancel</strong> your subscription, click "Manage Billing at paddle.net" above.</p>
                <p>• You keep access until the end of the current billing period.</p>
                <p>• To <strong>update your payment method</strong>, use the Paddle portal above.</p>
                <p>• For any other issues, <Link to="/contact" className="text-[hsl(220,91%,54%)] hover:underline">contact us</Link>.</p>
              </div>
            </div>
          </>
        ) : (
          /* No active subscription — direct enrolment, no verification gate */
          <div className="bg-white border border-slate-200 rounded-2xl p-7 text-center">
            <Crown className="w-10 h-10 text-[hsl(43,96%,50%)] mx-auto mb-4" />
            <div className="font-display text-xl font-bold text-slate-900 mb-2">Medical German</div>
            <div className="text-slate-500 text-sm mb-1">Monthly subscription · <strong>€19/month</strong></div>
            <div className="text-slate-400 text-xs mb-6">Cancel anytime at paddle.net. 14-day money-back guarantee.</div>
            <Link to="/checkout?courseId=medical-german">
              <button className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                <Crown className="w-4 h-4" /> Subscribe Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
