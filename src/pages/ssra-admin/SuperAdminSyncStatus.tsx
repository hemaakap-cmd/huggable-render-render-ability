import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GitBranch, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, Clock } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

interface SyncStatus {
  repo: string;
  branch: string;
  sha: string;
  short_sha: string;
  message: string;
  author: string;
  committed_at: string | null;
  html_url: string;
  fetched_at: string;
  error?: string;
}

const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SuperAdminSyncStatus() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data, isLoading, isFetching, refetch, error } = useQuery<SyncStatus>({
    queryKey: ["github-sync-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("github-sync-status");
      if (error) throw error;
      return data as SyncStatus;
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 60_000,
  });

  const buildBehind = data?.committed_at
    ? new Date(data.committed_at).getTime() > new Date(BUILD_TIME).getTime()
    : false;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              GitHub Sync Status
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Auto-refreshes every 5 minutes · Last check {data ? timeAgo(data.fetched_at) : "—"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh now
          </button>
        </div>

        {/* Status card */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            Loading…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900">Failed to reach GitHub</div>
              <div className="text-sm text-red-700 mt-1">{(error as Error).message}</div>
            </div>
          </div>
        ) : data?.error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="font-semibold text-red-900">GitHub API error</div>
            <div className="text-sm text-red-700 mt-1">{data.error}</div>
          </div>
        ) : data ? (
          <>
            {/* Sync banner */}
            <div
              className={`rounded-2xl p-5 flex items-start gap-3 border ${
                buildBehind
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              {buildBehind ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className={`font-semibold ${buildBehind ? "text-amber-900" : "text-emerald-900"}`}>
                  {buildBehind
                    ? "A newer commit exists on GitHub than the deployed build"
                    : "Deployed build is in sync with the latest commit on GitHub"}
                </div>
                <div className={`text-sm mt-1 ${buildBehind ? "text-amber-700" : "text-emerald-700"}`}>
                  {buildBehind
                    ? "Click Sync from the GitHub button in Lovable to pull updates."
                    : "All changes on the main branch are applied."}
                </div>
              </div>
            </div>

            {/* Commit details */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Latest commit</h2>
                <a
                  href={data.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                <Row label="Repo" value={data.repo} />
                <Row label="Branch" value={data.branch} />
                <Row label="SHA" value={<code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{data.short_sha}</code>} />
                <Row label="Message" value={<span className="whitespace-pre-wrap">{data.message}</span>} />
                <Row label="Author" value={data.author} />
                <Row
                  label="Commit time"
                  value={
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                      {data.committed_at ? new Date(data.committed_at).toLocaleString() : "—"}
                      <span className="text-slate-400">({timeAgo(data.committed_at)})</span>
                    </span>
                  }
                />
              </dl>
            </div>

            {/* Build info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Build info</h2>
              <dl className="text-sm space-y-2">
                <Inline label="Current build time" value={`${new Date(BUILD_TIME).toLocaleString()} (${timeAgo(BUILD_TIME)})`} />
                <Inline label="Last GitHub check" value={`${new Date(data.fetched_at).toLocaleString()} (${timeAgo(data.fetched_at)})`} />
                <Inline label="Next check in" value="≤ 5 minutes" />
              </dl>
            </div>

            <p className="text-xs text-slate-400 text-center" key={now}>
              Updates run automatically in the background.
            </p>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3 grid grid-cols-3 gap-4">
      <dt className="text-slate-500 font-medium">{label}</dt>
      <dd className="col-span-2 text-slate-800">{value}</dd>
    </div>
  );
}

function Inline({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}
