import { useState } from "react";
import { Users, Plus, Edit2, Trash2, X, Loader2, Calendar, CheckCircle2, Clock } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminBatches, useUpsertBatch, useDeleteBatch, useAdminCourses } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["upcoming", "active", "completed", "cancelled"] as const;

const EMPTY = {
  id: "", course_id: "", name: "", start_date: "", end_date: "",
  capacity: 50, status: "upcoming", notes: "",
};

const statusColor: Record<string, string> = {
  upcoming:  "bg-blue-50 text-blue-700 border-blue-200",
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminBatches() {
  const { data: batches = [], isLoading } = useAdminBatches();
  const { data: courses = [] }            = useAdminCourses();
  const upsert = useUpsertBatch();
  const remove = useDeleteBatch();
  const { toast } = useToast();

  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterCourse, setFilterCourse] = useState("");

  const field = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  function openNew()  { setForm({ ...EMPTY }); setModal(true); }
  function openEdit(b: any) {
    setForm({
      id: b.id, course_id: b.course_id,
      name: b.name, start_date: b.start_date ?? "", end_date: b.end_date ?? "",
      capacity: b.capacity, status: b.status, notes: b.notes ?? "",
    });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.course_id || !form.name) {
      toast({ title: "Course and batch name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        ...form,
        capacity: Number(form.capacity),
        start_date: form.start_date || null,
        end_date:   form.end_date   || null,
        id: form.id || undefined,
      });
      toast({ title: form.id ? "Batch updated" : "Batch created" });
      setModal(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete batch "${name}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Batch deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const filtered = filterCourse
    ? (batches as any[]).filter(b => b.course_id === filterCourse)
    : (batches as any[]);

  const grouped = filtered.reduce((acc: Record<string, any[]>, b) => {
    const key = b.ssra_courses?.title ?? b.course_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Batch Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage cohorts — each batch is one run of a course with its own start date and capacity.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterCourse}
              onChange={e => setFilterCourse(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none"
            >
              <option value="">All courses</option>
              {(courses as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
              <Plus className="w-4 h-4" /> New Batch
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["upcoming", "active", "completed", "cancelled"] as const).map(s => {
            const count = (batches as any[]).filter(b => b.status === s).length;
            return (
              <div key={s} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="text-xs text-slate-500 capitalize mb-1">{s}</div>
                <div className="text-3xl font-bold font-display text-slate-900">{count}</div>
                <div className="text-xs text-slate-400 mt-0.5">batches</div>
              </div>
            );
          })}
        </div>

        {/* Batches grouped by course */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
            No batches yet. Create one to start managing cohorts.
          </div>
        ) : (
          Object.entries(grouped).map(([courseName, batchListRaw]) => {
            const batchList = batchListRaw as any[];
            return (
            <div key={courseName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <div className="font-semibold text-slate-800 text-sm">{courseName}</div>
                <span className="text-xs text-slate-400 ml-auto">{batchList.length} batch{batchList.length !== 1 ? "es" : ""}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Batch Name</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Start Date</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">End Date</th>
                    <th className="text-center px-4 py-3">Seats</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(batchList as any[]).map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{b.name}</div>
                        {b.notes && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{b.notes}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">
                        {b.start_date ? new Date(b.start_date).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">
                        {b.end_date ? new Date(b.end_date).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-semibold text-sm ${b.enrolled_count >= b.capacity ? "text-red-600" : "text-slate-700"}`}>
                          {b.enrolled_count}/{b.capacity}
                        </span>
                        <div className="w-16 mx-auto h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.enrolled_count >= b.capacity ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(100, (b.enrolled_count / b.capacity) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border capitalize ${statusColor[b.status] ?? ""}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => del(b.id, b.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">{form.id ? "Edit Batch" : "New Batch"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Course *</label>
                <select required value={form.course_id} onChange={e => field("course_id", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 bg-white">
                  <option value="">Select course…</option>
                  {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Batch Name *</label>
                <input required value={form.name} onChange={e => field("name", e.target.value)}
                  placeholder="e.g. Batch 3 — April 2026"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => field("start_date", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => field("end_date", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Capacity (seats)</label>
                  <input type="number" min="1" value={form.capacity} onChange={e => field("capacity", Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select value={form.status} onChange={e => field("status", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 bg-white">
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes (internal)</label>
                <textarea rows={2} value={form.notes} onChange={e => field("notes", e.target.value)}
                  placeholder="Internal notes about this batch…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : form.id ? "Save Changes" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
