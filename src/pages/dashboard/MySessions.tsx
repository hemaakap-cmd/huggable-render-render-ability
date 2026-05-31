import { Video, Clock, ExternalLink, Calendar } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useUpcomingSessions, usePastSessions } from "@/hooks/useSsraData";

function SessionCard({ s, isPast = false }: { s: any; isPast?: boolean }) {
  const date = new Date(s.scheduled_at);
  const dateStr = date.toLocaleDateString("en-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row gap-4 ${
      isPast ? "border-slate-200 opacity-70" : "border-blue-100 shadow-sm"
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        isPast ? "bg-slate-100" : "bg-[hsl(220,91%,54%)]/10"
      }`}>
        <Video className={`w-5 h-5 ${isPast ? "text-slate-400" : "text-[hsl(220,91%,54%)]"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm">{s.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{s.ssra_courses?.title}</div>
        {s.description && (
          <div className="text-xs text-slate-500 mt-1.5 line-clamp-2">{s.description}</div>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateStr}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeStr} · {s.duration_minutes} min
          </span>
        </div>

        {s.recording_url && (
          <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:underline">
            <Video className="w-3 h-3" /> Watch recording
          </a>
        )}
      </div>

      <div className="shrink-0 flex items-start">
        {!isPast && (
          <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[hsl(220,91%,54%)] px-4 py-2 rounded-lg hover:bg-[hsl(220,91%,46%)] transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Join Zoom
          </a>
        )}
        {isPast && s.zoom_password && (
          <span className="text-xs text-slate-400">Past session</span>
        )}
      </div>
    </div>
  );
}

export default function MySessions() {
  const { data: upcoming = [], isLoading: uLoading } = useUpcomingSessions();
  const { data: past = [],     isLoading: pLoading } = usePastSessions();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Live Zoom Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">Your upcoming and past Medical German live classes.</p>
        </div>

        {/* Upcoming */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Upcoming Sessions</h2>
            {!uLoading && (
              <span className="text-xs text-slate-400 ml-auto">{(upcoming as any[]).length} scheduled</span>
            )}
          </div>

          {uLoading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
          ) : (upcoming as any[]).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500 text-sm">No upcoming sessions yet.</div>
              <div className="text-xs text-slate-400 mt-1">Check back soon — sessions are added regularly.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {(upcoming as any[]).map((s: any) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          )}
        </section>

        {/* Past */}
        {(!pLoading && (past as any[]).length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <h2 className="font-semibold text-slate-900 text-sm">Past Sessions</h2>
              <span className="text-xs text-slate-400 ml-auto">{(past as any[]).length} sessions</span>
            </div>
            <div className="space-y-3">
              {(past as any[]).map((s: any) => (
                <SessionCard key={s.id} s={s} isPast />
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
