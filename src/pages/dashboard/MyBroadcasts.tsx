import { useQuery } from "@tanstack/react-query";
import { Video, Calendar, Clock, ExternalLink, KeyRound, Radio } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSsraAuth } from "@/hooks/useSsraAuth";

interface BroadcastRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  zoom_link: string;
  zoom_password: string | null;
}

export default function MyBroadcasts() {
  const { profile } = useSsraAuth();

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["my-zoom-broadcasts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // SECURITY DEFINER RPC returns only the columns students need —
      // never exposes admin analytics (sent_count, audience_filters, etc.).
      const { data, error } = await (supabase as any).rpc("get_my_zoom_broadcasts");
      if (error) throw error;
      return (data ?? []) as unknown as BroadcastRow[];
    },
  });

  const now = Date.now();
  const upcoming = broadcasts.filter((b) => new Date(b.scheduled_at).getTime() + b.duration_minutes * 60_000 >= now);
  const past = broadcasts.filter((b) => new Date(b.scheduled_at).getTime() + b.duration_minutes * 60_000 < now);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Live Broadcasts</h1>
            <p className="text-slate-500 text-sm mt-1">
              Zoom meeting invitations sent to you by the academy.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-slate-600 text-sm font-medium">No invitations yet</div>
            <div className="text-xs text-slate-400 mt-1">
              When the team broadcasts a live Zoom session, it will appear here.
            </div>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="font-semibold text-slate-900 text-sm">Upcoming</h2>
                  <span className="text-xs text-slate-400 ml-auto">{upcoming.length}</span>
                </div>
                <div className="space-y-3">
                  {upcoming.map((b) => <BroadcastCard key={b.id} b={b} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <h2 className="font-semibold text-slate-900 text-sm">Past</h2>
                  <span className="text-xs text-slate-400 ml-auto">{past.length}</span>
                </div>
                <div className="space-y-3">
                  {past.map((b) => <BroadcastCard key={b.id} b={b} isPast />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function BroadcastCard({ b, isPast = false }: { b: BroadcastRow; isPast?: boolean }) {
  const date = new Date(b.scheduled_at);
  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`bg-white border rounded-xl p-5 ${isPast ? "border-slate-200 opacity-70" : "border-blue-100 shadow-sm"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPast ? "bg-slate-100" : "bg-blue-100"}`}>
          <Video className={`w-5 h-5 ${isPast ? "text-slate-400" : "text-blue-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 text-sm">{b.title}</div>
          {b.description && (
            <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{b.description}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeStr} · {b.duration_minutes} min
            </span>
          </div>

          {b.zoom_password && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <KeyRound className="w-3 h-3" /> Passcode: <span className="font-mono font-semibold">{b.zoom_password}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        {isPast ? (
          <span className="text-xs text-slate-400">This session has ended</span>
        ) : (
          <a
            href={b.zoom_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Join Zoom
          </a>
        )}
      </div>
    </div>
  );
}
