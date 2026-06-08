import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Video, Plus, Trash2, Edit2, ExternalLink, Calendar, Clock, Users, Lock } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminSessions, useUpsertSession, useDeleteSession, useAdminCourses } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AUTH_ERROR_PATTERN = /(unauthorized|jwt|session|auth)/i;

async function invokeSessionCredentials(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    throw new Error("Your login session expired. Please sign in again, then save the Zoom link.");
  }

  const result = await supabase.functions.invoke("manage-session-credentials", {
    body,
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });

  if (result.error) {
    const message = result.error.message || "Could not save Zoom credentials.";
    if (AUTH_ERROR_PATTERN.test(message)) {
      await supabase.auth.signOut();
      throw new Error("Your login session expired. Please sign in again, then save the Zoom link.");
    }
    throw result.error;
  }

  return result.data;
}

const EMPTY = {
  id: "",
  course_id: "",
  title: "",
  description: "",
  zoom_link: "",
  zoom_password: "",
  scheduled_at: "",
  duration_minutes: 60,
  recording_url: "",
  is_cancelled: false,
};

export default function AdminSessions() {
  const { data: sessions = [], isLoading } = useAdminSessions();
  const { data: courses = [] }             = useAdminCourses();
  const upsert                             = useUpsertSession();
  const remove                             = useDeleteSession();
  const { toast }                          = useToast();

  const [searchParams] = useSearchParams();
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterCourse, setFilterCourse] = useState(searchParams.get("course") ?? "");

  function openNew() { setForm({ ...EMPTY }); setOpen(true); }
  async function openEdit(s: any) {
    setForm({
      ...EMPTY,
      ...s,
      scheduled_at: s.scheduled_at ? new Date(s.scheduled_at).toISOString().slice(0, 16) : "",
      zoom_link: "",
      zoom_password: "",
    });
    setOpen(true);
    // Lazy-load existing credentials via the secure edge function.
    try {
      const data = await invokeSessionCredentials({ action: "get", sessionId: s.id });
      if (data) {
        setForm((f) => ({ ...f, zoom_link: data.zoom_link ?? "", zoom_password: data.zoom_password ?? "" }));
      }
    } catch (e: any) {
      toast({ title: "Login expired", description: e.message, variant: "destructive" });
      if (AUTH_ERROR_PATTERN.test(e.message)) window.location.href = `/login?redirect=${encodeURIComponent("/ssra-admin/sessions")}`;
    }
  }

  async function save() {
    if (!form.course_id || !form.title || !form.zoom_link || !form.scheduled_at) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Upsert the session row (no credential columns anymore).
      const id = await upsert.mutateAsync({
        ...(form.id ? { id: form.id } : {}),
        course_id:        form.course_id,
        title:            form.title,
        description:      form.description || null,
        scheduled_at:     new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        recording_url:    form.recording_url || null,
        is_cancelled:     form.is_cancelled,
      });
      // 2. Push credentials through the locked-down edge function.
      const sessionId = (id as string) || form.id;
      if (sessionId && !form.is_cancelled) {
        await invokeSessionCredentials({
          action: "upsert",
          sessionId,
          zoom_link: form.zoom_link,
          zoom_password: form.zoom_password || null,
          notify: !!form.id, // notify on edits only
        });
      }
      toast({ title: form.id ? "Session updated" : "Session created" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      if (AUTH_ERROR_PATTERN.test(e.message)) window.location.href = `/login?redirect=${encodeURIComponent("/ssra-admin/sessions")}`;
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this session?")) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Session deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }


  const now = new Date();
  const filtered  = filterCourse ? (sessions as any[]).filter(s => s.course_id === filterCourse) : (sessions as any[]);
  const upcoming  = filtered.filter(s => new Date(s.scheduled_at) >= now && !s.is_cancelled);
  const past      = filtered.filter(s => new Date(s.scheduled_at) < now || s.is_cancelled);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Zoom Sessions</h1>
            <p className="text-slate-500 text-sm mt-1">Schedule and manage live Zoom classes for Medical German and other courses.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 bg-white"
            >
              <option value="">All courses</option>
              {(courses as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
              <Plus className="w-4 h-4" /> New Session
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Calendar, label: "Upcoming",  value: upcoming.length, color: "text-emerald-600" },
            { icon: Clock,    label: "Total",      value: (sessions as any[]).length, color: "text-blue-600" },
            { icon: Users,    label: "Courses",    value: courses.length, color: "text-purple-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <div className="text-3xl font-bold font-display text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Upcoming sessions */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Upcoming Sessions</h2>
            <span className="ml-auto text-xs text-slate-400">{upcoming.length}</span>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No upcoming sessions. Create one above.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcoming.map((s: any) => <SessionRow key={s.id} s={s} onEdit={openEdit} onDelete={del} />)}
            </div>
          )}
        </div>

        {/* Past sessions */}
        {past.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Past Sessions</h2>
              <span className="ml-auto text-xs text-slate-400">{past.length}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {past.map((s: any) => <SessionRow key={s.id} s={s} onEdit={openEdit} onDelete={del} isPast />)}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{form.id ? "Edit Session" : "New Zoom Session"}</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Course */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Course *</label>
                <select value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select course…</option>
                  {(courses as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Session Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Week 3 — Body & Movement Vocabulary"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Duration (minutes)</label>
                  <input type="number" value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Zoom link */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Zoom Meeting Link *</label>
                <input value={form.zoom_link} onChange={e => setForm(f => ({ ...f, zoom_link: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Zoom password */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Zoom Password (optional)</label>
                <input value={form.zoom_password} onChange={e => setForm(f => ({ ...f, zoom_password: e.target.value }))}
                  placeholder="Meeting passcode"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="What will be covered in this session…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Recording URL */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Recording URL (add after session)</label>
                <input value={form.recording_url} onChange={e => setForm(f => ({ ...f, recording_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Cancelled toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_cancelled}
                  onChange={e => setForm(f => ({ ...f, is_cancelled: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-600">Mark as cancelled</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] disabled:opacity-60 transition-colors">
                {saving ? "Saving…" : form.id ? "Update" : "Create Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SessionRow({ s, onEdit, onDelete, isPast = false }: {
  s: any; onEdit: (s: any) => void; onDelete: (id: string) => void; isPast?: boolean;
}) {
  const date = new Date(s.scheduled_at);
  const timeStr = date.toLocaleDateString("en-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    + " · " + date.toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${s.is_cancelled ? "opacity-50" : ""}`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${isPast ? "bg-slate-300" : "bg-emerald-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 text-sm">{s.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{s.ssra_courses?.title} · {timeStr} · {s.duration_minutes} min</div>
        {s.is_cancelled && <span className="text-xs text-red-500 font-semibold">Cancelled</span>}
        {s.recording_url && (
          <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
            <Video className="w-3 h-3" /> Watch recording
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          <Lock className="w-3 h-3" /> Zoom in vault
        </span>
        <button onClick={() => onEdit(s)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
