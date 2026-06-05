import { useState } from "react";
import { Video, Clock, ExternalLink, Calendar, Loader2, AlertCircle, Download } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyUpcomingSessions, usePastSessions } from "@/hooks/useSsraData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function formatIcsDate(dateStr: string): string {
  return new Date(dateStr).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function downloadIcs(sessions: any[]) {
  const events = sessions.map((s) => {
    const start = formatIcsDate(s.scheduled_at);
    const endMs = new Date(s.scheduled_at).getTime() + (s.duration_minutes ?? 60) * 60000;
    const end = formatIcsDate(new Date(endMs).toISOString());
    const title = `${s.title}${s.ssra_courses?.title ? ` — ${s.ssra_courses.title}` : ""}`;
    const desc = s.description ? s.description.replace(/\n/g, "\\n") : "";
    return [
      "BEGIN:VEVENT",
      `UID:ssra-session-${s.id}@ssra.academy`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      desc ? `DESCRIPTION:${desc}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SSRA Academy//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ssra-sessions.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function JoinZoomButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-session-access", {
        body: { sessionId },
      });

      if (error) throw error;

      if (data?.zoom_link) {
        window.open(data.zoom_link, "_blank", "noopener,noreferrer");
      } else if (data?.minutesUntilOpen !== undefined) {
        toast({
          title: "Session not open yet",
          description: `Zoom access opens ${data.minutesUntilOpen} minute${data.minutesUntilOpen !== 1 ? "s" : ""} before the session starts.`,
        });
      } else {
        toast({ title: "Access unavailable", description: data?.error ?? "Could not retrieve session link.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve session link";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[hsl(220,91%,54%)] px-4 py-2 rounded-lg hover:bg-[hsl(220,91%,46%)] transition-colors disabled:opacity-60"
    >
      {loading
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</>
        : <><ExternalLink className="w-3.5 h-3.5" /> Join Zoom</>}
    </button>
  );
}

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

      <div className="shrink-0 flex items-start gap-2">
        {!isPast && (
          <button
            onClick={() => downloadIcs([s])}
            title="Add to calendar"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        {!isPast && s.is_cancelled ? (
          <span className="flex items-center gap-1 text-xs text-red-500 font-medium px-3 py-2 bg-red-50 rounded-lg border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        ) : !isPast ? (
          <JoinZoomButton sessionId={s.id} />
        ) : (
          <span className="text-xs text-slate-400">Past session</span>
        )}
      </div>
    </div>
  );
}

export default function MySessions() {
  const { data: upcoming = [], isLoading: uLoading } = useMyUpcomingSessions();
  const { data: past = [],     isLoading: pLoading } = usePastSessions();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Live Zoom Sessions</h1>
            <p className="text-slate-500 text-sm mt-1">Your upcoming and past live classes.</p>
          </div>
          {(upcoming as any[]).length > 0 && (
            <button
              onClick={() => downloadIcs(upcoming as any[])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to Calendar
            </button>
          )}
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
