import { useState } from "react";
import { BookOpen, Upload, CheckCircle2, Clock, X, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyHomework, useSubmitHomework } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  late:      "bg-amber-50 text-amber-700 border-amber-200",
  graded:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  returned:  "bg-purple-50 text-purple-700 border-purple-200",
  missing:   "bg-red-50 text-red-600 border-red-200",
};

export default function MyHomework() {
  const [submitModal, setSubmitModal] = useState<any>(null);
  const [text, setText]               = useState("");
  const [fileUrl, setFileUrl]         = useState("");
  const [saving, setSaving]           = useState(false);

  const { data: submissions = [], isLoading } = useMyHomework();
  const submit = useSubmitHomework();
  const { toast } = useToast();

  function openSubmit(sub: any) {
    setSubmitModal(sub);
    setText(sub.text_content ?? "");
    setFileUrl(sub.file_url ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !fileUrl.trim()) {
      toast({ title: "Provide either text or a file URL", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await submit.mutateAsync({
        materialId:  submitModal.material_id,
        courseId:    submitModal.course_id,
        textContent: text.trim() || undefined,
        fileUrl:     fileUrl.trim() || undefined,
      });
      toast({ title: "Homework submitted!" });
      setSubmitModal(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  const graded  = (submissions as any[]).filter(s => s.status === "graded").length;
  const pending = (submissions as any[]).filter(s => s.status === "submitted" || s.status === "late").length;
  const avgGrade = (() => {
    const gs = (submissions as any[]).filter(s => s.grade != null).map(s => s.grade);
    return gs.length ? Math.round(gs.reduce((a: number, b: number) => a + b, 0) / gs.length) : null;
  })();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My Homework</h1>
          <p className="text-slate-500 text-sm mt-1">View assignments, submit work, and check your grades.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs text-slate-500 mb-1">Graded</div>
            <div className="text-3xl font-bold font-display text-slate-900">{graded}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <div className="text-xs text-amber-600 font-semibold mb-1">Submitted</div>
            <div className="text-3xl font-bold font-display text-amber-700">{pending}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs text-slate-500 mb-1">Avg Grade</div>
            <div className="text-3xl font-bold font-display text-slate-900">
              {avgGrade !== null ? `${avgGrade}%` : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : (submissions as any[]).length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              No homework assignments yet.
            </div>
          ) : (
            (submissions as any[]).map((sub: any) => (
              <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 mb-0.5">
                      {sub.ssra_course_materials?.title ?? "Assignment"}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      {sub.ssra_courses?.title ?? "—"}
                      {sub.submitted_at && (
                        <> · Submitted {new Date(sub.submitted_at).toLocaleDateString("en-DE", { day: "numeric", month: "short" })}</>
                      )}
                    </div>

                    {/* Grade + feedback */}
                    {sub.grade != null && (
                      <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-800">Grade: </span>
                          <span className={`text-lg font-bold ${sub.grade >= 60 ? "text-emerald-600" : "text-red-500"}`}>
                            {sub.grade}%
                          </span>
                        </div>
                        {sub.feedback && (
                          <p className="text-sm text-slate-600 mt-1 pl-7">{sub.feedback}</p>
                        )}
                      </div>
                    )}

                    {/* Submitted text preview */}
                    {sub.text_content && (
                      <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 max-h-24 overflow-y-auto border border-slate-100 whitespace-pre-wrap">
                        {sub.text_content}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[sub.status] ?? ""}`}>
                      {sub.status}
                    </span>
                    {(sub.status === "missing" || sub.status === "returned") && (
                      <button onClick={() => openSubmit(sub)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(220,91%,54%)] text-white text-xs font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {sub.status === "returned" ? "Resubmit" : "Submit"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">Submit Homework</h2>
              <button onClick={() => setSubmitModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="text-sm text-slate-600 font-medium">
                {submitModal.ssra_course_materials?.title ?? "Assignment"}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Your Answer / Text Submission
                </label>
                <textarea rows={5} value={text} onChange={e => setText(e.target.value)}
                  placeholder="Write your answer here…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 resize-none" />
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="flex-1 h-px bg-slate-100" />
                <span>or attach a file</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  File URL (Google Drive, Dropbox, etc.)
                </label>
                <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setSubmitModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
