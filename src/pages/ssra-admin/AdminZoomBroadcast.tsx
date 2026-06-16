import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Video, Send, Loader2, Users, CheckCircle2, AlertCircle, Calendar, Clock,
  Link as LinkIcon, Eye, X, Filter, MailOpen, MousePointerClick, ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AudienceType =
  | "all_students"
  | "enrolled_after"
  | "enrolled_before"
  | "course"
  | "cohort"
  | "active_subscribers"
  | "custom"
  | "not_previously_invited"
  | "unattended_previous";

interface Broadcast {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  zoom_link: string;
  zoom_password: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  joined_count: number;
  audience_type: string;
  audience_filters: Record<string, unknown>;
  created_at: string;
}

const AUDIENCE_OPTIONS: { value: AudienceType; label: string; hint: string }[] = [
  { value: "all_students",            label: "All students",                    hint: "Every registered student account." },
  { value: "not_previously_invited",  label: "New students (never invited)",    hint: "Students who never received any Zoom broadcast." },
  { value: "enrolled_after",          label: "Enrolled after a date",           hint: "Active enrollments on/after the selected date." },
  { value: "enrolled_before",         label: "Enrolled before a date",          hint: "Active enrollments before the selected date." },
  { value: "course",                  label: "Students of a specific course",   hint: "Active enrollment in the selected course." },
  { value: "cohort",                  label: "Specific cohort / batch",         hint: "Students in the selected batch." },
  { value: "active_subscribers",      label: "Active subscribers only",         hint: "Students with an active Stripe subscription." },
  { value: "unattended_previous",     label: "Did not attend previous session", hint: "Recipients of a prior broadcast who never joined." },
  { value: "custom",                  label: "Custom emails",                   hint: "Paste a list of emails (one per line)." },
];

export default function AdminZoomBroadcast() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Compose
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [duration, setDuration]         = useState(60);
  const [zoomLink, setZoomLink]         = useState("");
  const [zoomPassword, setZoomPassword] = useState("");
  const [previewOpen, setPreviewOpen]   = useState(false);
  const [detailBroadcast, setDetailBroadcast] = useState<Broadcast | null>(null);

  // Audience
  const [audienceType, setAudienceType] = useState<AudienceType>("all_students");
  const [filterDate, setFilterDate]     = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterBatchId, setFilterBatchId]   = useState("");
  const [filterPriorId, setFilterPriorId]   = useState("");
  const [filterEmails, setFilterEmails]     = useState("");
  const [excludePrior, setExcludePrior]     = useState(true);

  const audienceFilters = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (filterDate)     f.date = new Date(filterDate).toISOString();
    if (filterCourseId) f.course_id = filterCourseId;
    if (filterBatchId)  f.batch_id = filterBatchId;
    if (filterPriorId)  f.prior_broadcast_id = filterPriorId;
    if (filterEmails.trim()) {
      f.emails = filterEmails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    }
    return f;
  }, [filterDate, filterCourseId, filterBatchId, filterPriorId, filterEmails]);

  // Reference data for filter controls
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-broadcast-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_courses").select("id, title").eq("is_active", true).order("title");
      return data ?? [];
    },
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["admin-broadcast-batches"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_batches").select("id, name, course_id").order("name");
      return data ?? [];
    },
  });

  // Audience preview (debounced)
  const [preview, setPreview] = useState<{ total: number; sample: { email: string; full_name: string }[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("preview-broadcast-audience", {
        body: { audienceType, audienceFilters, excludePriorRecipients: excludePrior },
      });
      if (cancelled) return;
      setPreviewLoading(false);
      if (error || (data as any)?.error) {
        setPreview({ total: 0, sample: [] });
      } else {
        setPreview(data as { total: number; sample: { email: string; full_name: string }[] });
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [audienceType, audienceFilters, excludePrior]);

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["zoom-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_zoom_broadcasts" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as Broadcast[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-send-zoom-invitation", {
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: duration,
          zoomLink: zoomLink.trim(),
          zoomPassword: zoomPassword.trim() || undefined,
          audienceType,
          audienceFilters,
          excludePriorRecipients: excludePrior,
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { total: number; sent: number; failed: number };
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation sent",
        description: `Queued for ${data.sent}/${data.total} students. ${data.failed > 0 ? `${data.failed} failed.` : ""}`,
      });
      setTitle(""); setDescription(""); setScheduledAt(""); setDuration(60);
      setZoomLink(""); setZoomPassword(""); setPreviewOpen(false);
      qc.invalidateQueries({ queryKey: ["zoom-broadcasts"] });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    },
  });

  const formValid = !!(title.trim() && scheduledAt && zoomLink.trim() && duration > 0);
  const canSubmit = formValid && !sendMutation.isPending && (preview?.total ?? 0) > 0;

  const audienceMeta = AUDIENCE_OPTIONS.find((a) => a.value === audienceType)!;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Zoom Broadcast</h1>
            <p className="text-slate-500 text-sm mt-1">
              Target the right students — track who opens, joins, and misses each session.
            </p>
          </div>
        </div>

        {/* Audience card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">1. Target audience</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer border rounded-xl p-3 text-xs transition ${
                  audienceType === opt.value
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={audienceType === opt.value}
                  onChange={() => setAudienceType(opt.value)}
                />
                <div className="font-semibold text-slate-800">{opt.label}</div>
                <div className="text-slate-500 mt-0.5">{opt.hint}</div>
              </label>
            ))}
          </div>

          {/* Conditional filters */}
          <div className="grid sm:grid-cols-2 gap-3">
            {(audienceType === "enrolled_after" || audienceType === "enrolled_before") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            )}
            {audienceType === "course" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Course *</label>
                <select
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">— select —</option>
                  {(courses as any[]).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
            )}
            {audienceType === "cohort" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cohort / batch *</label>
                <select
                  value={filterBatchId}
                  onChange={(e) => setFilterBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">— select —</option>
                  {(batches as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            {audienceType === "unattended_previous" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Previous broadcast (optional — any if blank)</label>
                <select
                  value={filterPriorId}
                  onChange={(e) => setFilterPriorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Any previous broadcast</option>
                  {broadcasts.map((b) => <option key={b.id} value={b.id}>{b.title} — {new Date(b.scheduled_at).toLocaleDateString()}</option>)}
                </select>
              </div>
            )}
            {audienceType === "custom" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Recipient emails (one per line)</label>
                <textarea
                  value={filterEmails}
                  onChange={(e) => setFilterEmails(e.target.value)}
                  rows={4}
                  placeholder="alice@example.com&#10;bob@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={excludePrior}
              onChange={(e) => setExcludePrior(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>Exclude students who already received any prior broadcast.</strong>
              <span className="text-slate-500 block">Prevents duplicate invitations when re-broadcasting old sessions.</span>
            </span>
          </label>

          {/* Live preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Users className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-blue-900 font-semibold">
                {previewLoading ? "Resolving audience…" : `${preview?.total ?? 0} recipient${preview?.total === 1 ? "" : "s"}`}
              </div>
              <div className="text-xs text-blue-700/80 mt-0.5">{audienceMeta.hint}</div>
              {preview && preview.sample.length > 0 && (
                <div className="mt-2 text-[11px] text-blue-800/80 truncate">
                  e.g. {preview.sample.slice(0, 3).map((s) => s.full_name || s.email).join(", ")}
                  {preview.total > 3 && ` +${preview.total - 3} more`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compose */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (formValid && (preview?.total ?? 0) > 0) setPreviewOpen(true); }}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
        >
          <h2 className="font-semibold text-slate-900 text-sm">2. Session details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required
                placeholder="Open Q&A with Dr. Hemaa"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3}
                placeholder="What will this session cover?"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date & time *
              </label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration (min) *
              </label>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                min={5} max={600} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Zoom link *
              </label>
              <input type="url" value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} required
                placeholder="https://zoom.us/j/..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passcode (optional)</label>
              <input value={zoomPassword} onChange={(e) => setZoomPassword(e.target.value)} maxLength={50}
                placeholder="e.g. 123456" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" /> Preview & send to {preview?.total ?? 0}
          </button>
        </form>

        {/* History */}
        <section>
          <h2 className="font-semibold text-slate-900 text-sm mb-3">Recent broadcasts</h2>
          {isLoading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
          ) : broadcasts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              No invitations sent yet.
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setDetailBroadcast(b)}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{b.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(b.scheduled_at).toLocaleString()} · {b.duration_minutes} min · <span className="font-medium text-slate-600">{b.audience_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={b.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs">
                    <Stat icon={<Users className="w-3 h-3" />}  label="Recipients" value={b.total_recipients} color="slate" />
                    <Stat icon={<CheckCircle2 className="w-3 h-3" />} label="Sent"   value={b.sent_count}  color="emerald" />
                    <Stat icon={<MailOpen className="w-3 h-3" />}  label="Opened"     value={b.opened_count ?? 0} color="blue" />
                    <Stat icon={<MousePointerClick className="w-3 h-3" />} label="Joined" value={b.joined_count ?? 0} color="violet" />
                    <Stat icon={<AlertCircle className="w-3 h-3" />} label="Failed"  value={b.failed_count} color={b.failed_count > 0 ? "red" : "slate"} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Preview/confirm modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sendMutation.isPending && setPreviewOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Confirm broadcast</h3>
                <p className="text-xs text-slate-500 mt-1">Review the audience before sending.</p>
              </div>
              <button onClick={() => setPreviewOpen(false)} disabled={sendMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                  <Users className="w-4 h-4" />
                  {preview?.total ?? 0} students will receive this email
                </div>
                <div className="text-xs text-blue-700/80 mt-1">{audienceMeta.label}{excludePrior ? " · excluding prior recipients" : ""}</div>
              </div>
              {preview && preview.sample.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">Sample (first 10)</div>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {preview.sample.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-700 truncate">{r.full_name || "—"}</span>
                        <span className="text-slate-500 font-mono truncate ml-3">{r.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-700">{title}</div>
                <div className="text-slate-500">
                  {scheduledAt && new Date(scheduledAt).toLocaleString()} · {duration} min
                </div>
                <div className="text-slate-500 truncate">{zoomLink}</div>
              </div>
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-2 justify-end">
              <button onClick={() => setPreviewOpen(false)} disabled={sendMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={() => sendMutation.mutate()} disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {sendMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Confirm & send to {preview?.total ?? 0}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBroadcast && (
        <BroadcastDetailDrawer broadcast={detailBroadcast} onClose={() => setDetailBroadcast(null)} />
      )}
    </AdminLayout>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate: "text-slate-600 bg-slate-50",
    emerald: "text-emerald-700 bg-emerald-50",
    blue: "text-blue-700 bg-blue-50",
    violet: "text-violet-700 bg-violet-50",
    red: "text-red-700 bg-red-50",
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 ${colors[color]}`}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {icon} {label}
      </div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sending: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    queued: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${map[status] ?? map.queued}`}>
      {status}
    </span>
  );
}

function BroadcastDetailDrawer({ broadcast, onClose }: { broadcast: Broadcast; onClose: () => void }) {
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["broadcast-recipients", broadcast.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ssra_zoom_broadcast_recipients" as never)
        .select("id, email, status, sent_at, email_opened, joined_session, opened_at, joined_at")
        .eq("broadcast_id", broadcast.id)
        .order("email");
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{broadcast.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(broadcast.scheduled_at).toLocaleString()} · {broadcast.duration_minutes} min · {broadcast.audience_type}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-5 border-b border-slate-100">
          <Stat icon={<Users className="w-3 h-3" />}  label="Recipients" value={broadcast.total_recipients} color="slate" />
          <Stat icon={<CheckCircle2 className="w-3 h-3" />} label="Sent"   value={broadcast.sent_count}  color="emerald" />
          <Stat icon={<MailOpen className="w-3 h-3" />}  label="Opened"     value={broadcast.opened_count ?? 0} color="blue" />
          <Stat icon={<MousePointerClick className="w-3 h-3" />} label="Joined" value={broadcast.joined_count ?? 0} color="violet" />
          <Stat icon={<AlertCircle className="w-3 h-3" />} label="Absent" value={Math.max(0, (broadcast.total_recipients ?? 0) - (broadcast.joined_count ?? 0))} color="red" />
        </div>
        <div className="overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Email</th>
                  <th className="text-center px-2 py-2 font-semibold">Sent</th>
                  <th className="text-center px-2 py-2 font-semibold">Opened</th>
                  <th className="text-center px-2 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-slate-700 font-mono truncate">{r.email}</td>
                    <td className="px-2 py-2 text-center">
                      {r.status === "queued" || r.status === "sent" ? "✓" : r.status === "failed" ? "✗" : "—"}
                    </td>
                    <td className="px-2 py-2 text-center">{r.email_opened ? "✓" : "—"}</td>
                    <td className="px-2 py-2 text-center">{r.joined_session ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
