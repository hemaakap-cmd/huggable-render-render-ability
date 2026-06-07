import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock, AlertCircle, CreditCard, BookOpen, ArrowRight, Receipt } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";

type EnrollmentRow = {
  id: string;
  course_id: string | null;
  status: string;
  amount_eur: number | null;
  paid_at: string | null;
  enrolled_at: string | null;
  created_at: string | null;
  order_number: string | null;
  stripe_payment_intent: string | null;
  course_title_snapshot: string | null;
  ssra_courses?: { title?: string | null } | null;
};

function useMyAllEnrollments() {
  return useQuery({
    queryKey: ["ssra-enrollments-me-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*, ssra_courses(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EnrollmentRow[];
    },
  });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status, paid }: { status: string; paid: boolean }) {
  if (status === "active" && paid) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" /> Successful
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5" /> Pending payment
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" /> Cancelled
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5" /> Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
      {status}
    </span>
  );
}

export default function OrderStatus() {
  const { data: rows = [], isLoading } = useMyAllEnrollments();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Order &amp; Payment Status</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track every course registration and payment attempt on your account.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="font-semibold text-slate-900">No orders yet</div>
            <p className="text-sm text-slate-500 mt-1 mb-4">You haven't registered for any course yet.</p>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,48%)]"
            >
              Browse Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const paid = !!r.paid_at || !!r.stripe_payment_intent;
              const title = r.course_title_snapshot || r.ssra_courses?.title || r.course_id || "Course";
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="font-mono">{r.order_number ?? r.id.slice(0, 8)}</span>
                      </div>
                      <div className="font-display text-lg font-bold text-slate-900 truncate">{title}</div>
                    </div>
                    <StatusBadge status={r.status} paid={paid} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <BookOpen className="w-3.5 h-3.5" /> Registration
                      </div>
                      <div className="font-semibold text-slate-900">
                        {r.status === "active"
                          ? "Confirmed"
                          : r.status === "cancelled"
                          ? "Cancelled"
                          : r.status === "pending"
                          ? "Awaiting payment"
                          : r.status}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{fmtDate(r.enrolled_at ?? r.created_at)}</div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <CreditCard className="w-3.5 h-3.5" /> Payment
                      </div>
                      <div className="font-semibold text-slate-900">
                        {paid ? "Received" : r.status === "cancelled" ? "Not charged" : "Not received"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{paid ? fmtDate(r.paid_at) : "—"}</div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500 mb-1">Amount</div>
                      <div className="font-semibold text-slate-900">
                        {r.amount_eur != null ? `€${Number(r.amount_eur).toFixed(2)}` : "—"}
                      </div>
                    </div>
                  </div>

                  {r.status === "pending" && (
                    <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        Your payment hasn't been confirmed yet. If you already paid, it may take a few minutes to
                        reflect. Otherwise you can retry from the course page.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
