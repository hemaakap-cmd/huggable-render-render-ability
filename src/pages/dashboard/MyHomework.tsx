import { useState } from "react";
import { BookOpen, Upload, CheckCircle2, X, Loader2, Calendar, FileText, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyHomeworkAssignments, useSubmitHomework, getHomeworkSignedUrl } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  late:      "bg-amber-50 text-amber-700 border-amber-200",
  graded:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  returned:  "bg-purple-50 text-purple-700 border-purple-200",
  missing:   "bg-red-50 text-red-600 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  late:      "Late",
  graded:    "Graded",
  returned:  "Returned for revision",
  missing:   "Not submitted",
};

const MAX_MB = 25;

export default function MyHomework() {
  const [submitModal, setSubmitModal] = useState<any>(null);
  const [text, setText]               = useState("");
  const [file, setFile]               = useState<File | null>(null);
  const [saving, setSaving]           = useState(false);

  const { data: assignments = [], isLoading } = useMyHomeworkAssignments();
  const submit = useSubmitHomework();
  const { toast } = useToast();

  function openSubmit(a: any) {
    setSubmitModal(a);
    setText(a.submission?.text_content ?? "");
    setFile(null);
  }
  function closeModal() {
    setSubmitModal(null);
    setText("");
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const a = submitModal;
    if (!text.trim() && !file && !a.submission?.storage_path) {
      toast({ title: "Attach a file or write your answer", variant: "destructive" });
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `File too large (max ${MAX_MB} MB)`, variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let storagePath: string | undefined = a.submission?.storage_path ?? undefined;

      if (file) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${a.course_id}/${a.material_id}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("homework-submissions")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        storagePath = path;
      }

      await submit.mutateAsync({
        materialId:  a.material_id,
        courseId:    a.course_id,
        textContent: text.trim() || undefined,
        storagePath,
      });
      toast({ title: "Homework submitted" });
      closeModal();
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message ?? String(err), variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function viewFile(storagePath: string) {
    try {
      const url = await getHomeworkSignedUrl(storagePath);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Could not open file", description: e.message, variant: "destructive" });
    }
  }

  const list = assignments as any[];
  const graded  = list.filter((a) => a.status === "graded").length;
  const pending = list.filter((a) => a.status === "submitted" || a.status === "late").length;
  const todo    = list.filter((a) => a.status === "missing" || a.status === "returned").length;
  const grades  = list.map((a) => a.submission?.grade).filter((g: any) => g != null) as number[];
  const avgGrade = grades.length ? Math.round(grades.reduce((s, n) => s + n, 0) / grades.length) : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My Homework</h1>
          <p className="text-slate-500 text-sm mt-1">View assignments, upload your work, and check your grades.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="To do"     value={todo}    tone="red"      />
          <Stat label="Submitted" value={pending} tone="amber"    />
          <Stat label="Graded"    value={graded}  tone="emerald"  />
          <Stat label="Avg grade" value={avgGrade !== null ? `${avgGrade}%` : "—"} tone="slate" />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : list.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              No homework assignments yet.
            </div>
          ) : (
            list.map((a: any) => {
              const sub = a.submission;
              const canSubmit = a.status === "missing" || a.status === "returned";
              return (
                <div key={a.material_id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">{a.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.course_title ?? "—"}</div>
                      {a.description && (
                        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{a.description}</p>
                      )}
                      {a.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                          <Calendar className="w-3.5 h-3.5" />
                          Due {new Date(a.due_date).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      )}

                      {sub?.grade != null && (
                        <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-slate-800">Grade:</span>
                            <span className={`text-lg font-bold ${sub.grade >= 60 ? "text-emerald-600" : "text-red-500"}`}>
                              {sub.grade}%
                            </span>
                          </div>
                          {sub.feedback && (
                            <p className="text-sm text-slate-600 mt-1 pl-6 whitespace-pre-wrap">{sub.feedback}</p>
                          )}
                        </div>
                      )}

                      {sub?.text_content && (
                        <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 max-h-24 overflow-y-auto border border-slate-100 whitespace-pre-wrap">
                          {sub.text_content}
                        </div>
                      )}

                      {sub?.storage_path && (
                        <button type="button" onClick={() => viewFile(sub.storage_path)}
                          className="mt-3 inline-flex items-center gap-1.5 text-blue-600 text-xs font-semibold hover:underline">
                          <FileText className="w-3.5 h-3.5" /> View submitted file
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${STATUS_COLORS[a.status] ?? ""}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      {canSubmit && (
                        <button onClick={() => openSubmit(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(220,91%,54%)] text-white text-xs font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {a.status === "returned" ? "Resubmit" : "Submit"}
                        </button>
                      )}
                      {a.status === "submitted" && (
                        <button onClick={() => openSubmit(a)}
                          className="text-xs text-slate-500 hover:text-slate-700 underline">
                          Update submission
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">Submit Homework</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-sm text-slate-600 font-medium">{submitModal.title}</div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Your answer (optional)
                </label>
                <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Write your answer here…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Attach file (PDF, image, doc — max {MAX_MB} MB)
                </label>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.zip,.mp3,.mp4,.heic"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                {file && (
                  <div className="text-xs text-slate-500 mt-1.5">
                    {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
                {!file && submitModal.submission?.storage_path && (
                  <div className="text-xs text-slate-400 mt-1.5">
                    Current file kept unless you choose a new one.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Uploading…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "red" | "amber" | "emerald" | "slate" }) {
  const tones: Record<string, string> = {
    red:     "bg-red-50 border-red-100 text-red-700",
    amber:   "bg-amber-50 border-amber-100 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    slate:   "bg-white border-slate-200 text-slate-900",
  };
  return (
    <div className={`rounded-2xl p-4 border ${tones[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold font-display">{value}</div>
    </div>
  );
}
