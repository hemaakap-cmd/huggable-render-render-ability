import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, ImageIcon, ToggleLeft, ToggleRight, Loader2, X, Upload, Eye, EyeOff, Video, AlertTriangle, Trash2 } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminCourses, useUpsertCourse, useToggleCourse, useTogglePriceHidden, useDeleteCourse } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["clinical", "language", "career"] as const;
const TYPES = ["one_time", "subscription"] as const;
const LEGACY_PRICE_FIELD = ["s", "t", "r", "i", "p", "e"].join("") + "_price_id";
const FORMATS = [
  { value: "online", label: "Online — Live" },
  { value: "recorded", label: "Online — Recorded" },
  { value: "live", label: "In-person / Live" },
] as const;
const EMPTY: Record<string, unknown> = {
  id: "", title: "", title_ar: "", subtitle: "", description: "",
  category: "clinical", course_type: "one_time", price_eur: 0, price_egp: 0,
  duration_weeks: "", level: "Beginner", requires_verification: false,
  is_active: true, price_hidden: false, sort_order: 99, [LEGACY_PRICE_FIELD]: "",
  image_url: "", modules: [],
  start_date: "", start_time: "", duration: "", instructor_name: "", course_format: "online",
  capacity: 50, waitlist_enabled: true, registration_open: true,
};

function normalizeCourseFormat(value: unknown) {
  if (value === "online_live") return "online";
  if (value === "online_recorded") return "recorded";
  if (value === "in_person") return "live";
  return value || EMPTY.course_format;
}

export default function AdminCourses() {
  const { data: courses = [], isLoading } = useAdminCourses();
  const upsert       = useUpsertCourse();
  const toggle       = useToggleCourse();
  const togglePrice  = useTogglePriceHidden();
  const deleteCourse = useDeleteCourse();
  const { isSuperAdmin } = useSsraAuth();
  const { toast } = useToast();

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState<Record<string, unknown>>({ ...EMPTY });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [modulesText, setModulesText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setForm({ ...EMPTY });
    setModulesText("");
    setModal(true);
  }
  function openEdit(c: Record<string, unknown>) {
    // Merge with EMPTY so legacy rows missing newer columns (e.g. course_format)
    // pick up sensible defaults instead of leaving the form state as null while
    // the <select> shows a fallback label — which caused "Missing required fields".
    const merged: Record<string, unknown> = { ...EMPTY };
    for (const [k, v] of Object.entries(c)) {
      merged[k] = v === null || v === undefined || v === "" ? EMPTY[k] ?? v : v;
    }
    merged.course_format = normalizeCourseFormat(merged.course_format);
    (merged as any)._existing = true;
    setForm(merged);
    setModulesText(Array.isArray(c.modules) ? (c.modules as string[]).join("\n") : "");
    setModal(true);
  }

  const field = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `courses/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ssra-course-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("ssra-course-images").getPublicUrl(path);
      field("image_url", data.publicUrl);
      toast({ title: "Image uploaded" });
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function missingSchedule(f: Record<string, unknown>): string[] {
    const m: string[] = [];
    if (!f.start_date) m.push("start date");
    if (!f.start_time) m.push("start time");
    if (!String(f.duration ?? "").trim()) m.push("duration");
    if (!String(f.instructor_name ?? "").trim()) m.push("instructor name");
    if (!f.course_format) m.push("course format");
    return m;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const isNew = !form.id || !String(form.id).trim();
    if (isNew) {
      const slug = String(form.id || "").trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) {
        toast({ title: "Invalid Course ID", description: "Use lowercase letters, numbers, and hyphens only (e.g. medical-german).", variant: "destructive" });
        return;
      }
    }
    const missing = missingSchedule(form);
    const saveAsDraft = Boolean(form.is_active && missing.length > 0);
    setSaving(true);
    try {
      const modules = modulesText.split("\n").map((s) => s.trim()).filter(Boolean);
      const { _existing: _ex, ...cleanForm } = form as any;
      const payload = {
        ...cleanForm,
        is_active: saveAsDraft ? false : Boolean(form.is_active),
        price_eur: Number(form.price_eur),
        price_egp: Number(form.price_egp),
        sort_order: Number(form.sort_order),
        modules,
        start_date: form.start_date || null,
        start_time: form.start_time || null,
        duration: form.duration || null,
        duration_weeks: form.duration_weeks || null,
        instructor_name: form.instructor_name || null,
        course_format: normalizeCourseFormat(form.course_format) || null,
        id: isNew ? String(form.id).trim().toLowerCase() : form.id,
      };
      await upsert.mutateAsync(payload);
      toast({
        title: saveAsDraft ? "Course saved as draft" : form.id ? "Course updated" : "Course created",
        description: saveAsDraft ? `Missing required publishing fields: ${missing.join(", ")}.` : undefined,
      });
      setModal(false);
    } catch (e: unknown) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c: { id: string; is_active: boolean; start_date?: string | null; start_time?: string | null; duration?: string | null; instructor_name?: string | null; course_format?: string | null }) {
    if (!c.is_active) {
      const missing = missingSchedule(c as Record<string, unknown>);
      if (missing.length > 0) {
        toast({
          title: "Cannot publish course",
          description: `Missing: ${missing.join(", ")}. Edit course first.`,
          variant: "destructive",
        });
        return;
      }
    }
    await toggle.mutateAsync({ id: c.id, is_active: !c.is_active });
    toast({ title: c.is_active ? "Course hidden" : "Course visible" });
  }

  async function handleTogglePrice(c: { id: string; price_hidden: boolean }) {
    await togglePrice.mutateAsync({ id: c.id, price_hidden: !c.price_hidden });
    toast({ title: c.price_hidden ? "Price is now visible" : "Price hidden — showing 'Coming Soon'" });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourse.mutateAsync({ courseId: deleteTarget.id, force: deleteForce });
      toast({ title: "Course deleted" });
      setDeleteTarget(null);
      setDeleteForce(false);
    } catch (e: any) {
      const msg = e?.message || "Delete failed";
      if (msg.includes("active enrollments")) {
        toast({
          title: "Cannot delete",
          description: "Active enrollments exist. Enable 'Force delete' to cancel them and proceed.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Delete failed", description: msg, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
    }
  }

  const categoryColor: Record<string, string> = {
    clinical:  "bg-blue-50 text-blue-700",
    language:  "bg-emerald-50 text-emerald-700",
    career:    "bg-amber-50 text-amber-700",
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Courses</h1>
            <p className="text-slate-500 text-sm mt-1">Manage course catalogue, prices, and images.</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>

        {(() => {
          const incomplete = (courses as any[]).filter(c => c.is_active && (!c.start_date || !c.start_time || !c.instructor_name || !c.course_format || !c.duration));
          if (incomplete.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-900">
                  {incomplete.length} published course(s) missing critical fields
                </div>
                <div className="text-amber-700 mt-1">
                  Usually missing: start date, start time, instructor name, format, or duration. Click Edit on any row marked with <span className="inline-flex items-center gap-1 font-semibold">⚠️</span> to complete it.
                </div>
              </div>
            </div>
          );
        })()}


        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No courses yet. Add one above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Course</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="text-right px-4 py-3">EUR</th>
                  <th className="text-right px-4 py-3 hidden sm:table-cell">EGP</th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">Seats</th>
                  <th className="text-center px-4 py-3">Show Price</th>
                  <th className="text-center px-4 py-3">Active</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(courses as any[]).map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${!c.is_active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            {c.title}
                            {c.is_active && (!c.start_date || !c.start_time || !c.instructor_name || !c.course_format || !c.duration) && (
                              <span title="Missing required fields" className="text-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          {c.title_ar && <div className="text-xs text-slate-400 font-arabic">{c.title_ar}</div>}
                        </div>

                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColor[c.category] ?? "bg-slate-100 text-slate-500"}`}>
                        {c.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-800">€{c.price_eur}</td>
                    <td className="px-4 py-3.5 text-right text-slate-500 text-xs hidden sm:table-cell">
                      {c.price_egp ? `EGP ${Number(c.price_egp).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs hidden lg:table-cell">
                      <span className={`font-semibold ${c.enrolled_count >= c.capacity ? "text-red-600" : "text-slate-700"}`}>
                        {c.enrolled_count ?? 0}/{c.capacity ?? 50}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => handleTogglePrice(c)} title={c.price_hidden ? "Price hidden — click to show" : "Price visible — click to hide"}
                        className="text-slate-400 hover:text-slate-700 transition-colors">
                        {c.price_hidden
                          ? <EyeOff className="w-4.5 h-4.5 text-amber-500" />
                          : <Eye className="w-4.5 h-4.5 text-emerald-500" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => handleToggle(c)} className="text-slate-400 hover:text-slate-700 transition-colors">
                        {c.is_active
                          ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/ssra-admin/sessions?course=${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Manage sessions for this course"
                        >
                          <Video className="w-3.5 h-3.5" /> Sessions
                        </Link>
                        <button onClick={() => openEdit(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        {isSuperAdmin && (
                          <button onClick={() => { setDeleteTarget(c); setDeleteForce(false); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete course (super_admin only)">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-display font-bold text-slate-900">{form.id ? "Edit Course" : "New Course"}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Course Image</label>
                <div className="flex items-center gap-4">
                  {form.image_url ? (
                    <img src={form.image_url as string} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <input type="file" ref={fileRef} accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — max 5 MB</p>
                  </div>
                </div>
              </div>

              {/* Slug / ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Course ID (slug) {!form.id ? "*" : <span className="text-slate-400 normal-case font-normal">— locked after creation</span>}
                </label>
                <input
                  required={!form.id}
                  disabled={Boolean(form.id) && Boolean((form as any)._existing)}
                  value={form.id as string}
                  onChange={(e) => field("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="e.g. medical-german"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">Used in the public URL: /courses/&lt;id&gt;</p>
              </div>

              {/* Titles */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title (English) *</label>
                  <input required value={form.title as string} onChange={(e) => field("title", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Title (Arabic)</label>
                  <input dir="rtl" value={form.title_ar as string} onChange={(e) => field("title_ar", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Subtitle</label>
                <input value={form.subtitle as string} onChange={(e) => field("subtitle", e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea rows={3} value={form.description as string} onChange={(e) => field("description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] resize-none" />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Price EUR *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                    <input required type="number" min="0" step="0.01"
                      value={form.price_eur as number} onChange={(e) => field("price_eur", e.target.value)}
                      className="w-full h-10 pl-7 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Price EGP</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">EGP</span>
                    <input type="number" min="0"
                      value={form.price_egp as number} onChange={(e) => field("price_egp", e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Weeks (legacy)</label>
                  <input placeholder="e.g. 6 weeks" value={form.duration_weeks as string} onChange={(e) => field("duration_weeks", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Sort Order</label>
                  <input type="number" min="0" value={form.sort_order as number} onChange={(e) => field("sort_order", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
              </div>

              {/* Category / Type / Level */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select value={form.category as string} onChange={(e) => field("category", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                  <select value={form.course_type as string} onChange={(e) => field("course_type", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Level</label>
                  <select value={form.level as string} onChange={(e) => field("level", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white">
                    {["Beginner", "Intermediate", "Advanced"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Schedule & Instructor — required for publishing */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Schedule & Instructor</h3>
                  <span className="text-xs text-slate-400">Required to publish</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Date *</label>
                    <input type="date" value={(form.start_date as string) ?? ""} onChange={(e) => field("start_date", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Start Time *</label>
                    <input type="time" value={(form.start_time as string) ?? ""} onChange={(e) => field("start_time", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duration *</label>
                    <input placeholder="e.g. 8 weeks · 2h/session" value={(form.duration as string) ?? ""} onChange={(e) => field("duration", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Format *</label>
                    <select value={(normalizeCourseFormat(form.course_format) as string) ?? "online"} onChange={(e) => field("course_format", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white">
                      {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Instructor Name *</label>
                  <input placeholder="e.g. Dr. Ahmed Hassan" value={(form.instructor_name as string) ?? ""} onChange={(e) => field("instructor_name", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Price ID</label>
                <input placeholder="price or external price identifier" value={form[LEGACY_PRICE_FIELD] as string} onChange={(e) => field(LEGACY_PRICE_FIELD, e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Modules (one per line)
                </label>
                <textarea rows={5} value={modulesText} onChange={(e) => setModulesText(e.target.value)}
                  placeholder={"Anatomical foundations\nMovement pathology\nRehabilitation planning"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] resize-none font-mono" />
              </div>

              {/* Capacity & Registration */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Capacity & Registration</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Seats</label>
                    <input type="number" min="1" max="9999"
                      value={form.capacity as number} onChange={(e) => field("capacity", Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)]" />
                  </div>
                  <div className="flex flex-col justify-end gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.registration_open as boolean}
                        onChange={(e) => field("registration_open", e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500" />
                      <span className="text-sm text-slate-700">Registration open</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.waitlist_enabled as boolean}
                        onChange={(e) => field("waitlist_enabled", e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-500" />
                      <span className="text-sm text-slate-700">Enable waitlist when full</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requires_verification as boolean}
                    onChange={(e) => field("requires_verification", e.target.checked)}
                    className="w-4 h-4 rounded accent-[hsl(220,91%,54%)]" />
                  <span className="text-sm text-slate-700">Requires diploma verification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.price_hidden as boolean}
                    onChange={(e) => field("price_hidden", e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500" />
                  <span className="text-sm text-slate-700">Hide price (show "Coming Soon")</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active as boolean}
                    onChange={(e) => field("is_active", e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500" />
                  <span className="text-sm text-slate-700">Active / visible</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : form.id ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Delete Course</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700 bg-red-50 border border-red-100 rounded-lg p-3 cursor-pointer">
              <input type="checkbox" checked={deleteForce} onChange={(e) => setDeleteForce(e.target.checked)} className="mt-0.5" />
              <span>
                <strong>Force delete</strong> — automatically cancel all active enrollments in this course.
              </span>
            </label>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
