import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, Trash2, Loader2, FileText, Video, Link as LinkIcon, BookOpen, Clock } from "lucide-react";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MaterialType = "document" | "video" | "homework" | "link" | "slides";

const TYPE_ICON: Record<MaterialType, typeof FileText> = {
  document: FileText,
  video:    Video,
  homework: BookOpen,
  link:     LinkIcon,
  slides:   FileText,
};

const TYPE_COLOR: Record<MaterialType, string> = {
  document: "bg-blue-50 text-blue-600",
  video:    "bg-purple-50 text-purple-600",
  homework: "bg-amber-50 text-amber-600",
  link:     "bg-emerald-50 text-emerald-600",
  slides:   "bg-slate-50 text-slate-600",
};

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

function useMaterials(courseId: string) {
  return useQuery({
    queryKey: ["instructor-materials", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_course_materials" as never) as any)
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useAddMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Record<string, unknown>) => {
      const { error } = await (supabase.from("ssra_course_materials" as never) as any).insert(m);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["instructor-materials", vars.course_id] }),
  });
}

function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await (supabase.from("ssra_course_materials" as never) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["instructor-materials", vars.courseId] }),
  });
}

const BLANK = { title: "", description: "", file_url: "", external_link: "", material_type: "document" as MaterialType, due_date: "" };

export default function InstructorMaterials() {
  const { user } = useSsraAuth();
  const { toast } = useToast();
  const { data: courses = [] } = useMyCoursesSimple();
  const [courseId, setCourseId] = useState<string>("");
  const activeCourse = courseId || (courses as any[])[0]?.id || "";
  const { data: materials = [], isLoading } = useMaterials(activeCourse);
  const add = useAddMaterial();
  const del = useDeleteMaterial();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !activeCourse) return;
    await add.mutateAsync({
      course_id:     activeCourse,
      uploaded_by:   user!.id,
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      file_url:      form.file_url.trim() || null,
      external_link: form.external_link.trim() || null,
      material_type: form.material_type,
      due_date:      form.due_date || null,
      is_visible:    true,
    });
    toast({ title: "Material added" });
    setForm(BLANK);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync({ id, courseId: activeCourse });
    toast({ title: "Material removed" });
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Materials</h1>
            <p className="text-slate-500 text-sm mt-1">Upload documents, videos, and homework for your students.</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>

        {/* Course select */}
        <select
          value={activeCourse}
          onChange={(e) => setCourseId(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {(courses as any[]).map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">New Material</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Week 1 Slides" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
                <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value as MaterialType })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="document">Document</option>
                  <option value="slides">Slides</option>
                  <option value="video">Video</option>
                  <option value="homework">Homework</option>
                  <option value="link">Link</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Brief description" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">File URL</label>
                <input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">External Link</label>
                <input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://…" />
              </div>
            </div>
            {form.material_type === "homework" && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Due Date</label>
                <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={add.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {add.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Materials list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : materials.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No materials uploaded yet. Click "Add Material" to start.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m: any) => {
              const Icon = TYPE_ICON[m.material_type as MaterialType] ?? FileText;
              const color = TYPE_COLOR[m.material_type as MaterialType] ?? "bg-slate-50 text-slate-600";
              return (
                <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{m.title}</div>
                    {m.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</div>}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100">{m.material_type}</span>
                      {m.due_date && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" /> Due {new Date(m.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {(m.file_url || m.external_link) && (
                        <a href={m.file_url || m.external_link} target="_blank" rel="noopener noreferrer"
                          className="text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Open
                        </a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(m.id)} disabled={del.isPending}
                    className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
