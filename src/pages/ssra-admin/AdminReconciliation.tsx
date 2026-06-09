import { useState } from "react";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Wrench,
  Clock, ChevronDown, ChevronUp, Loader2, Play,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Finding = {
  check:      string;
  status:     "passed" | "warning" | "fixed";
  count?:     number;
  message:    string;
  action?:    string;
  course_id?: string;
  course?:    string;
};

type Report = {
  id:            string;
  ran_at:        string;
  duration_ms:   number | null;
  status:        "running" | "completed" | "failed";
  checks_total:  number;
  checks_passed: number;
  checks_failed: number;
  auto_fixed:    number;
  findings:      Finding[];
  error?:        string;
  triggered_by:  string;
};

function useReports() {
  return useQuery({
    queryKey: ["reconciliation-reports"],
    queryFn:  async () => {
      const { data, error } = await (supabase.from("ssra_reconciliation_reports" as never) as any)
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    refetchInterval: 8000,
  });
}

function useTriggerReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "nightly-reconciliation",
        { body: { trigger: "manual" } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reconciliation started");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["reconciliation-reports"] }), 3000);
    },
    onError: (e: Error) => toast.error("Failed: " + e.message),
  });
}

function FindingRow({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const icon =
    f.status === "passed" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
    ) : f.status === "fixed" ? (
      <Wrench className="w-4 h-4 text-blue-500 shrink-0" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
    );

  const bg =
    f.status === "passed"
      ? "bg-emerald-50 border-emerald-100"
      : f.status === "fixed"
      ? "bg-blue-50 border-blue-100"
      : "bg-amber-50 border-amber-100";

  return (
    <div className={`rounded-xl border px-4 py-3 ${bg}`}>
      <button
        className="w-full flex items-center gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="flex-1 text-sm font-medium text-slate-900">
          {f.message}
        </span>
        {f.count !== undefined && (
          <span className="text-xs font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">
            {f.count}
          </span>
        )}
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && (
        <div className="mt-2 pl-6 text-xs text-slate-600 space-y-1">
          <div>
            <span className="font-mono bg-white/70 px-1.5 py-0.5 rounded">
              {f.check}
            </span>
          </div>
          {f.action && (
            <div className="text-slate-500">Action: {f.action}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const [open, setOpen] = useState(false);
  const isRunning = report.status === "running";
  const hasFailed = report.status === "failed";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        className="w-full flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="mt-0.5">
          {isRunning ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : hasFailed ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : report.checks_failed === 0 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-900">
              {new Date(report.ran_at).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
            {isRunning && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Running…
              </span>
            )}
            {!isRunning && !hasFailed && (
              <span className="text-xs text-slate-400">
                {report.duration_ms != null
                  ? `${report.duration_ms} ms`
                  : ""}
              </span>
            )}
            <span className="text-xs text-slate-400 capitalize">
              {report.triggered_by === "cron"
                ? "⏰ Scheduled"
                : "👤 Manual"}
            </span>
          </div>
          {!isRunning && !hasFailed && (
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
              <span className="text-emerald-600">
                ✓ {report.checks_passed} passed
              </span>
              {report.checks_failed > 0 && (
                <span className="text-amber-600">
                  ⚠ {report.checks_failed} issues
                </span>
              )}
              {report.auto_fixed > 0 && (
                <span className="text-blue-600">
                  🔧 {report.auto_fixed} auto-fixed
                </span>
              )}
            </div>
          )}
          {hasFailed && (
            <div className="text-xs text-red-600 mt-1">{report.error}</div>
          )}
        </div>

        {!isRunning && (
          open ? (
            <ChevronUp className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          )
        )}
      </button>

      {open && !isRunning && !hasFailed && (
        <div className="px-6 pb-6 space-y-2 border-t border-slate-100 pt-4">
          {(report.findings as Finding[]).map((f, i) => (
            <FindingRow key={i} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReconciliation() {
  const { data: reports = [], isLoading } = useReports();
  const trigger = useTriggerReconciliation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-[hsl(220,91%,54%)]" />
            Nightly Reconciliation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Automated self-healing. Runs at 02:00 UTC. Auto-fixes safe
            inconsistencies and flags data that needs review.
          </p>
        </div>
        <button
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
          className="flex items-center gap-2 bg-[hsl(220,91%,54%)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {trigger.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run Now
        </button>
      </div>

      {/* What it checks */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          What reconciliation checks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-slate-600">
          {[
            "enrolled_count accuracy (auto-fix)",
            "batch enrolled_count accuracy (auto-fix)",
            "Expired waitlist notifications (auto-fix)",
            "Missing notification preferences (auto-fix)",
            "Orphan certificates with no enrollment",
            "Active subscriptions with cancelled enrollment",
            "Stale pending enrollments > 48 h",
            "Failed webhooks in last 24 h",
            "Failed transactional emails in last 24 h",
            "Unresolved fraud flags > 7 days",
          ].map((item) => (
            <div key={item} className="flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">•</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Reports list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No reconciliation reports yet.</p>
          <p className="text-xs mt-1">
            The first run will occur at 02:00 UTC, or click "Run Now".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
