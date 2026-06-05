import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Calendar, Clock, Edit2, Check, X, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useMyCoursesSimple() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["instructor-courses-simple", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from("ssra_instructor_assignments" as never) as any)
        .select("course_id, ssra_courses(id, title)")
        .eq("instructor_id", user!.id)
        .eq("is_active", true);
      return ((data ?? []) as any[]).map((a: any) => a.ssra_courses);
    },
  });
}

function useMySessions(courseIds: string[]) {
  return useQuery({
    queryKey: ["instructor-all-sessions", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, title, scheduled_at, duration_minutes, zoom_link, zoom_password, is_cancelled, course_id, ssra_courses(title)")
        .in("course_id", courseIds)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useUpdateSessionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, zoom_link, zoom_password }: { id: string; zoom_link: string; zoom_password?: string }) => {
      const { error } = await supabase.from("ssra_sessions")
        .update({ zoom_link, zoom_password: zoom_password ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["instructor-all-sessions"] });
    },
  });
}

function EditLinkForm({ session, onClose }: { session: any; onClose: () => void }) {
  const [link, setLink]   = useState(session.zoom_link ?? "");
  const [pass, setPass]   = useState(session.zoom_password ?? "");
  const { toast } = useToast();
  const update = useUpdateSessionLink();

  const save = async () => {
    if (!link.trim()) return;
    await update.mutateAsync({ id: session.id, zoom_link: link.trim(), zoom_password: pass.trim() });
    toast({ title: "Zoom link updated" });
    onClose();
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1 block">Zoom Link</label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://zoom.us/j/..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1 block">Meeting Password (optional)</label>
        <input
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={update.isPending || !link.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
        >
          {update.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
        </button>
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function InstructorSessions() {
  const { data: courses = [] } = useMyCoursesSimple();
  const courseIds = (courses as any[]).map((c: any) => c.id);
  const { data: sessions = [], isLoading } = useMySessions(courseIds);
  const [editingId, setEditingId] = useState<string | null>(null);

  const now = new Date();
  const upcoming = sessions.filter((s: any) => !s.is_cancelled && new Date(s.scheduled_at) > now);
  const past     = sessions.filter((s: any) => new Date(s.scheduled_at) <= now || s.is_cancelled);

  const SessionRow = ({ s }: { s: any }) => {
    const dt = new Date(s.scheduled_at);
    return (
      <div className={`bg-white border rounded-xl p-4 ${s.is_cancelled ? "opacity-60 border-slate-200" : "border-slate-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.is_cancelled ? "bg-slate-100" : "bg-emerald-50"}`}>
            <Video className={`w-5 h-5 ${s.is_cancelled ? "text-slate-400" : "text-emerald-600"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{s.title}</span>
              {s.is_cancelled && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Cancelled
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {(s.ssra_courses as any)?.title}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · {s.duration_minutes} min</span>
            </div>

            {s.zoom_link && (
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={s.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[hsl(220,91%,54%)] flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Zoom link set
                </a>
              </div>
            )}

            {editingId === s.id && (
              <EditLinkForm session={s} onClose={() => setEditingId(null)} />
            )}
          </div>

          {!s.is_cancelled && (
            <button
              onClick={() => setEditingId(editingId === s.id ? null : s.id)}
              className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">Manage Zoom links and view all sessions for your courses.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h2 className="font-semibold text-slate-900 text-sm">Upcoming ({upcoming.length})</h2>
                </div>
                <div className="space-y-3">
                  {upcoming.map((s: any) => <SessionRow key={s.id} s={s} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <h2 className="font-semibold text-slate-900 text-sm">Past Sessions ({past.length})</h2>
                </div>
                <div className="space-y-3">
                  {past.slice(0, 10).map((s: any) => <SessionRow key={s.id} s={s} />)}
                </div>
              </section>
            )}

            {sessions.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
                <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No sessions for your courses yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </InstructorLayout>
  );
}
