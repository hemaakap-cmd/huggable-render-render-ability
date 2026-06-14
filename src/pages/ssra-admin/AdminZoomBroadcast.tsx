import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Video, Send, Loader2, Users, CheckCircle2, AlertCircle, Calendar, Clock, Link as LinkIcon, Eye, X } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
}

export default function AdminZoomBroadcast() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [zoomLink, setZoomLink] = useState("");
  const [zoomPassword, setZoomPassword] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Count + sample of recipients
  const { data: recipientsInfo, isLoading: recipientsLoading } = useQuery({
    queryKey: ["zoom-broadcast-recipients"],
    queryFn: async () => {
      const [{ count }, { data: sample }] = await Promise.all([
        supabase
          .from("ssra_profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student")
          .not("email", "is", null),
        supabase
          .from("ssra_profiles")
          .select("email, full_name")
          .eq("role", "student")
          .not("email", "is", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      return { count: count ?? 0, sample: sample ?? [] };
    },
  });

  const studentCount = recipientsInfo?.count ?? 0;

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
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setDuration(60);
      setZoomLink("");
      setZoomPassword("");
      setPreviewOpen(false);
      qc.invalidateQueries({ queryKey: ["zoom-broadcasts"] });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    },
  });

  const formValid = !!(title.trim() && scheduledAt && zoomLink.trim() && duration > 0);
  const canSubmit = formValid && !sendMutation.isPending;

  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setPreviewOpen(true);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Zoom Meeting Invitation</h1>
            <p className="text-slate-500 text-sm mt-1">
              Broadcast a live Zoom session to <strong>all registered students</strong> (paid or not).
            </p>
          </div>
        </div>

        {/* Compose form */}
        <form onSubmit={handleOpenPreview} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              <strong>{recipientsLoading ? "…" : studentCount}</strong> registered students will receive this invitation by email.
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                required
                placeholder="Open Q&A with Dr. Hemaa"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What will this session cover?"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date & time *
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Duration (min) *
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={5}
                max={600}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" /> Zoom link *
              </label>
              <input
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                required
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passcode (optional)</label>
              <input
                value={zoomPassword}
                onChange={(e) => setZoomPassword(e.target.value)}
                maxLength={50}
                placeholder="e.g. 123456"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!formValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview recipients & send
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
                <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{b.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(b.scheduled_at).toLocaleString()} · {b.duration_minutes} min
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Users className="w-3 h-3" /> {b.total_recipients} total
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> {b.sent_count} sent
                    </span>
                    {b.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" /> {b.failed_count} failed
                      </span>
                    )}
                    <span className="text-slate-400 ml-auto">
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Preview modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sendMutation.isPending && setPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Confirm invitation</h3>
                <p className="text-xs text-slate-500 mt-1">Review who will receive this email.</p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                disabled={sendMutation.isPending}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
                  <Users className="w-4 h-4" />
                  {studentCount} students will receive this email
                </div>
                <div className="text-xs text-blue-700/80 mt-1">All registered students (paid or not).</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">Sample (first 10 recipients)</div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {(recipientsInfo?.sample ?? []).length === 0 ? (
                    <div className="text-xs text-slate-400 p-3 text-center">No recipients found.</div>
                  ) : (
                    recipientsInfo!.sample.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-700 truncate">{r.full_name || "—"}</span>
                        <span className="text-slate-500 font-mono truncate ml-3">{r.email}</span>
                      </div>
                    ))
                  )}
                </div>
                {studentCount > 10 && (
                  <div className="text-[11px] text-slate-400 mt-2">
                    + {studentCount - 10} more not shown
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-700">{title}</div>
                <div className="text-slate-500">
                  {scheduledAt && new Date(scheduledAt).toLocaleString()} · {duration} min
                </div>
                <div className="text-slate-500 truncate">{zoomLink}</div>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex gap-2 justify-end">
              <button
                onClick={() => setPreviewOpen(false)}
                disabled={sendMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={!canSubmit || studentCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Confirm & send to {studentCount}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
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
