import { useState } from "react";
import { BookOpen, CheckCircle2, Clock, X, Loader2, ExternalLink, Star } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminHomework, useGradeHomework, useAdminCourses } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  late:      "bg-amber-50 text-amber-700 border-amber-200",
  graded:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  returned:  "bg-purple-50 text-purple-700 border-purple-200",
  missing:   "bg-red-50 text-red-600 border-red-200",
};

export default function AdminHomework() {
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [gradeModal, setGradeModal]     = useState<any>(null);
  const [grade, setGrade]               = useState<string>("80");
  const [feedback, setFeedback]         = useState("");
  const [saving, setSaving]             = useState(false);

  const { data: courses = [] } = useAdminCourses();
  const { data: submissions = [], isLoading } = useAdminHomework(
    filterCourse || undefined,
    filterStatus || undefined,
  );
  const gradeHw = useGradeHomework();
  const { toast } = useToast();

  function openGrade(sub: any) {
    setGradeModal(sub);
    setGrade(sub.grade?.toString() ?? "80");
    setFeedback(sub.feedback ?? "");
  }

  async function submitGrade(e: React.FormEvent) {
    e.preventDefault();
    const g = Number(grade);
    if (isNaN(g) || g < 0 || g > 100) {
      toast({ title: "Grade must be 0–100", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await gradeHw.mutateAsync({ id: gradeModal.id, grade: g, feedback });
      toast({ title: "Submission graded" });
      setGradeModal(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  const pending    = (submissions as any[]).filter(s => s.status === "submitted" || s.status === "late").length;
  const graded     = (submissions as any[]).filter(s => s.status === "graded").length;
  const avgGrade   = (() => {
    const gs = (submissions as any[]).filter(s => s.grade != null).map(s => s.grade);
    return gs.length ? Math.round(gs.reduce((a, b) => a + b, 0) / gs.length) : null;
  })();

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Homework Submissions</h1>
            <p className="text-slate-500 text-sm mt-1">Review, grade, and provide feedback on all student submissions.</p>
          </div>
          <div className="flex gap-3">
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none">
              <option value="">All courses</option>
              {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none">
              <option value="">All statuses</option>
              {["submitted","late","graded","returned","missing"].map(s => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <div className="text-xs text-amber-600 font-semibold mb-1">Needs Grading</div>
            <div className="text-3xl font-bold font-display text-amber-700">{pending}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <div className="text-xs text-emerald-600 font-semibold mb-1">Graded</div>
            <div className="text-3xl font-bold font-display text-emerald-700">{graded}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="text-xs text-slate-500 mb-1">Avg Grade</div>
            <div className="text-3xl font-bold font-display text-slate-900">
              {avgGrade !== null ? `${avgGrade}%` : "—"}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : (submissions as any[]).length === 0 ? (
            <div className="text-center py-16 text-slate-400">No submissions found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Student</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Course</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Material</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Grade</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Submitted</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(submissions as any[]).map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{sub.ssra_profiles?.full_name ?? "—"}</div>
                      <div className="text-xs text-slate-400">{sub.ssra_profiles?.email ?? ""}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell text-xs">
                      {sub.ssra_courses?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 hidden lg:table-cell text-xs max-w-[140px] truncate">
                      {sub.ssra_course_materials?.title ?? sub.material_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${STATUS_COLORS[sub.status] ?? ""}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {sub.grade != null ? (
                        <span className={`font-bold ${sub.grade >= 60 ? "text-emerald-600" : "text-red-500"}`}>
                          {sub.grade}%
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleDateString("en-DE", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.file_url && (
                          <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => openGrade(sub)}
                          className="px-3 py-1.5 rounded-lg bg-[hsl(220,91%,54%)] text-white text-xs font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
                          {sub.grade != null ? "Re-grade" : "Grade"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Grade modal */}
      {gradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">Grade Submission</h2>
              <button onClick={() => setGradeModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pt-4 pb-2">
              <div className="text-sm text-slate-600 mb-1 font-medium">{gradeModal.ssra_profiles?.full_name}</div>
              <div className="text-xs text-slate-400 mb-3">
                {gradeModal.ssra_courses?.title ?? "—"} — {gradeModal.ssra_course_materials?.title ?? "material"}
              </div>
              {gradeModal.text_content && (
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 border border-slate-100 max-h-40 overflow-y-auto mb-4 whitespace-pre-wrap">
                  {gradeModal.text_content}
                </div>
              )}
              {gradeModal.file_url && (
                <a href={gradeModal.file_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 text-sm mb-4 hover:underline">
                  <ExternalLink className="w-4 h-4" /> View submitted file
                </a>
              )}
            </div>
            <form onSubmit={submitGrade} className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Grade (0–100) *
                </label>
                <input
                  type="number" min="0" max="100" required
                  value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Feedback</label>
                <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="Personalized feedback for the student…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setGradeModal(null)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : "Submit Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
