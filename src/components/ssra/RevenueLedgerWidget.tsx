import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Euro, ArrowDownLeft, ShieldAlert, Receipt, Wallet, Hash, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PaddleEnv = "live" | "sandbox";
type RangeKey = "today" | "7d" | "30d" | "custom";

interface Summary {
  gross_cents: number;
  refund_cents: number;
  chargeback_cents: number;
  fee_cents: number;
  tax_cents: number;
  net_cents: number;
  event_count: number;
  currency: string;
}

function startOf(range: RangeKey, customFrom?: string): Date {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
  }
  if (range === "7d")  return new Date(now.getTime() - 7  * 86_400_000);
  if (range === "30d") return new Date(now.getTime() - 30 * 86_400_000);
  return customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86_400_000);
}

function endOf(range: RangeKey, customTo?: string): Date {
  if (range === "custom" && customTo) {
    const d = new Date(customTo); d.setHours(23, 59, 59, 999); return d;
  }
  return new Date();
}

const fmt = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

function KpiCard({ icon: Icon, label, value, sub, tone = "slate" }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  tone?: "slate" | "emerald" | "rose" | "amber" | "violet" | "blue";
}) {
  const toneClass = {
    slate:   "text-slate-500",
    emerald: "text-emerald-500",
    rose:    "text-rose-500",
    amber:   "text-amber-500",
    violet:  "text-violet-500",
    blue:    "text-[hsl(220,91%,54%)]",
  }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${toneClass}`} />
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold font-display text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function RevenueLedgerWidget() {
  const [env, setEnv] = useState<PaddleEnv>("live");
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo,   setCustomTo]   = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Defense-in-depth: hide widget for non-admins; server still enforces.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc("is_ssra_admin", { _uid: user.id } as any);
      setIsAdmin(Boolean(data));
    })();
  }, []);

  const from = useMemo(() => startOf(range, customFrom), [range, customFrom]);
  const to   = useMemo(() => endOf(range, customTo),     [range, customTo]);

  const summaryQ = useQuery({
    enabled: isAdmin === true,
    queryKey: ["revenue-summary", env, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_revenue_summary", {
        _from: from.toISOString(),
        _to:   to.toISOString(),
        _env:  env,
      } as any);
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Summary | null;
    },
  });

  const trendQ = useQuery({
    enabled: isAdmin === true,
    queryKey: ["revenue-trend", env, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revenue_events")
        .select("occurred_at, amount_cents, direction, currency")
        .eq("environment", env)
        .gte("occurred_at", from.toISOString())
        .lt("occurred_at",  to.toISOString())
        .order("occurred_at", { ascending: true })
        .limit(10_000);
      if (error) throw error;
      return (data ?? []) as { occurred_at: string; amount_cents: number; direction: string; currency: string }[];
    },
  });

  const trend = useMemo(() => {
    const rows = trendQ.data ?? [];
    const map = new Map<string, { date: string; gross: number; refunds: number; net: number }>();
    for (const r of rows) {
      const day = r.occurred_at.slice(0, 10);
      const bucket = map.get(day) ?? { date: day, gross: 0, refunds: 0, net: 0 };
      const eur = r.amount_cents / 100;
      if (r.direction === "credit") { bucket.gross += eur; bucket.net += eur; }
      else                          { bucket.refunds += eur; bucket.net -= eur; }
      map.set(day, bucket);
    }
    return Array.from(map.values())
      .map(b => ({ ...b, gross: +b.gross.toFixed(2), refunds: +b.refunds.toFixed(2), net: +b.net.toFixed(2) }));
  }, [trendQ.data]);

  if (isAdmin === false) return null;

  const s = summaryQ.data;
  const currency = s?.currency ?? "EUR";
  const refundsPct = s && s.gross_cents > 0 ? ((s.refund_cents + s.chargeback_cents) / s.gross_cents) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-5 space-y-5">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">Revenue Ledger</h2>
          <p className="text-xs text-slate-500">Immutable accounting view from Paddle webhooks.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Env toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            {(["live", "sandbox"] as PaddleEnv[]).map(e => (
              <button
                key={e}
                onClick={() => setEnv(e)}
                className={`px-2.5 py-1 rounded-md font-medium ${env === e ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {e === "live" ? "Live" : "Test"}
              </button>
            ))}
          </div>
          {/* Range toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            {([
              ["today", "Today"], ["7d", "7d"], ["30d", "30d"], ["custom", "Custom"],
            ] as [RangeKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-2.5 py-1 rounded-md font-medium ${range === k ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
              >{label}</button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 bg-white"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Euro}          label="Gross"        value={s ? fmt(s.gross_cents, currency) : "—"}     tone="emerald" />
        <KpiCard icon={ArrowDownLeft} label="Refunds"      value={s ? fmt(s.refund_cents, currency) : "—"}    tone="rose" />
        <KpiCard icon={ShieldAlert}   label="Chargebacks"  value={s ? fmt(s.chargeback_cents, currency) : "—"} tone="amber" />
        <KpiCard icon={Receipt}       label="Fees"         value={s ? fmt(s.fee_cents, currency) : "—"}       tone="slate" />
        <KpiCard icon={Percent}       label="Tax"          value={s ? fmt(s.tax_cents, currency) : "—"}       tone="violet" />
        <KpiCard icon={Wallet}        label="Net"          value={s ? fmt(s.net_cents, currency) : "—"}       tone="blue" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Hash}          label="Transactions" value={s ? String(s.event_count) : "—"}            tone="slate"
                 sub={`${range === "custom" ? "custom" : range} · ${env}`} />
        <KpiCard icon={Percent}       label="Refund rate"  value={`${refundsPct.toFixed(1)}%`}                tone={refundsPct > 5 ? "rose" : "emerald"} />
        <KpiCard icon={Euro}          label="Avg ticket"
                 value={s && s.event_count > 0 ? fmt(Math.round(s.gross_cents / s.event_count), currency) : "—"}
                 tone="slate" />
        <KpiCard icon={Wallet}        label="Net margin"
                 value={s && s.gross_cents > 0 ? `${((s.net_cents / s.gross_cents) * 100).toFixed(0)}%` : "—"}
                 tone="blue" />
      </div>

      {/* Trend chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">Revenue trend</h3>
          <span className="text-[11px] text-slate-400">
            {from.toLocaleDateString()} → {to.toLocaleDateString()}
          </span>
        </div>
        {trendQ.isLoading ? (
          <div className="h-56 flex items-center justify-center text-slate-300 text-sm">Loading…</div>
        ) : trend.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-300 text-sm">No revenue events in this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(160,84%,39%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(220,91%,54%)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(220,91%,54%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                formatter={(v: number, name: string) => [fmt(Math.round(Number(v) * 100), currency), name]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="gross" name="Gross" stroke="hsl(160,84%,39%)" fill="url(#grossGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="net"   name="Net"   stroke="hsl(220,91%,54%)" fill="url(#netGrad)"   strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {summaryQ.isError && (
        <div className="text-xs text-rose-600">Failed to load revenue summary. Admin access required.</div>
      )}
    </div>
  );
}
