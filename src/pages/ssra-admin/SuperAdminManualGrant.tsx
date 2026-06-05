import { useState } from "react";
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { COURSES } from "@/lib/courseCatalog";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function SuperAdminManualGrant() {
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState(COURSES[0].id);
  const [kind, setKind] = useState<"subscription" | "enrollment">("subscription");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountEur, setAmountEur] = useState("29");
  const [periodMonths, setPeriodMonths] = useState("1");
  const [skipVerification, setSkipVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Auto-switch kind/amount when changing course
  const course = COURSES.find((c) => c.id === courseId);
  const isSub = course?.type === "subscription";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error("Email is required");
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manual-grant", {
        body: {
          email: email.trim(),
          courseId,
          kind: isSub ? "subscription" : kind,
          stripeReference: paymentReference.trim() || undefined,
          amountEur: Number(amountEur) || 0,
          periodMonths: Number(periodMonths) || 1,
          skipVerification,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Granted successfully");
      setResult(JSON.stringify(data, null, 2));
      setEmail("");
      setPaymentReference("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to grant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <Helmet><title>Manual Grant — SSRA Admin</title></Helmet>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Manual Grant</h1>
        <p className="text-sm text-slate-500 mb-6">
          Manually register a Paddle, legacy, or offline payment/subscription for a student when the webhook did not fire.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <Field label="Student email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="input"
            />
          </Field>

          <Field label="Course">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="input">
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — €{c.price}{c.type === "subscription" ? "/mo" : ""}
                </option>
              ))}
            </select>
          </Field>

          {!isSub && (
            <Field label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="input">
                <option value="enrollment">One-time enrollment</option>
                <option value="subscription">Subscription (force)</option>
              </select>
            </Field>
          )}

          <Field label="Payment reference (Transaction / Subscription ID / Receipt #)">
            <input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="transaction, subscription, or receipt code"
              className="input font-mono text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (EUR)">
              <input
                type="number" step="0.01"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                className="input"
              />
            </Field>
            {(isSub || kind === "subscription") && (
              <Field label="Period (months)">
                <input
                  type="number" min="1"
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(e.target.value)}
                  className="input"
                />
              </Field>
            )}
          </div>

          <label className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={skipVerification}
              onChange={(e) => setSkipVerification(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs text-amber-900">
              <strong>Skip payment verification</strong> — only use when payment verification is unavailable or for legacy/offline receipts. The reference will be saved as-is without validation.
            </span>
          </label>


          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[hsl(220,91%,54%)] text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Grant Access
          </button>
        </form>

        {result && (
          <pre className="mt-4 p-4 bg-slate-900 text-emerald-300 rounded-xl text-xs overflow-auto">
            {result}
          </pre>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.625rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: hsl(220,91%,54%); box-shadow: 0 0 0 3px hsl(220,91%,54%,0.1); }
      `}</style>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
