import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  enrollmentId: string;
  courseTitle: string;
  daysRemaining: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function CancelEnrollmentDialog({ enrollmentId, courseTitle, daysRemaining, onClose, onSubmitted }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast({ title: "Reason too short", description: "Please tell us why in at least a sentence.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("request-enrollment-cancellation", {
      body: { enrollmentId, reason: reason.trim() },
    });
    setSubmitting(false);
    if (error || (data && (data as any).error)) {
      toast({
        title: "Could not submit request",
        description: (data as any)?.error ?? error?.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Request submitted", description: "Our team will review it within 1–3 business days." });
    onSubmitted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-display text-lg font-bold text-slate-900">Request cancellation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-2">
          You are requesting to cancel <span className="font-semibold">{courseTitle}</span>.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-4 space-y-1.5">
          <div className="font-semibold">14-day cancellation window</div>
          <div>You have <span className="font-semibold">{daysRemaining}</span> day{daysRemaining === 1 ? "" : "s"} remaining to request a full refund.</div>
          <div>Refunds are processed by our payment provider, Paddle, and may take 5–10 business days to appear on your statement.</div>
          <div>An admin will review your request within 1–3 business days.</div>
        </div>

        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason for cancellation</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell us briefly why you'd like to cancel…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]"
        />
        <div className="text-right text-[10px] text-slate-400 mt-1">{reason.length}/1000</div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Keep enrollment
          </button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  );
}
