import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen, Plus, Trash2, Loader2, FileText, Video, Link as LinkIcon,
  BookOpen, Clock, Upload, Music, Lock, Unlock, Download,
} from "lucide-react";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MaterialType = "document" | "video" | "audio" | "homework" | "link" | "slides";

const TYPE_ICON: Record<MaterialType, typeof FileText> = {
  document: FileText, video: Video, audio: Music,
  homework: BookOpen, link: LinkIcon, slides: FileText,
};

const TYPE_COLOR: Record<MaterialType, string> = {
  document: "bg-blue-50 text-blue-600",
  video:    "bg-purple-50 text-purple-600",
  audio:    "bg-pink-50 text-pink-600",
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
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("id, title")
        .eq("instructor_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string }[];
    },
  });
}

function useMaterials(courseId: string) {
  return useQuery({
    queryKey: ["instructor-materials", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_materials" as never) as any)
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
      const { error } = await (supabase.from("ssra_materials" as never) as any).insert(m);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["instructor-materials", vars.course_id] }),
  });
}

function useToggleDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, allow_download }: { id: string; allow_download: boolean; courseId: string }) => {
      const { error } = await (supabase.from("ssra_materials" as never) as any)
        .update({ allow_download }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["instructor-materials", vars.courseId] }),
  });
}

function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storagePath, courseId }: { id: string; storagePath?: string | null; courseId: string }) => {
      if (storagePath) {
        await supabase.storage.from("course-materials").remove([storagePath]);
      }
      const { error } = await (supabase.from("ssra_materials" as never) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["instructor-materials", vars.courseId] }),
  });
}

const BLANK = {
  title: "", description: "", external_link: "",
  material_type: "document" as MaterialType, due_date: "",
  allow_download: false,
};

const MAX_MB = 100;

export default function InstructorMaterials() {
  const { user } = useSsraAuth();
  const { toast } = useToast();
  const { data: courses = [] } = useMyCoursesSimple();
  const [courseId, setCourseId] = useState<string>("");
  const activeCourse = courseId || courses[0]?.id || "";
  const { data: materials = [], isLoading } = useMaterials(activeCourse);
  const add = useAddMaterial();
  const del = useDeleteMaterial();
  const toggle = useToggleDownload();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isLinkType = form.material_type === "link";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !activeCourse) return;
    if (!isLinkType && !file && !form.external_link.trim()) {
      toast({ title: "Please attach a file or external link", variant: "destructive" });
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `File too large (max ${MAX_MB}MB)`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let storage_path: string | null = null;
      let file_name: string | null = null;
      let file_size: number | null = null;
      let mime_type: string | null = null;

      if (file) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${activeCourse}/${crypto.randomUUID()}-${safe}`;
        const { error: ue } = await supabase.storage
          .from("course-materials")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (ue) throw ue;
        storage_path = path;
        file_name = file.name;
        file_size = file.size;
        mime_type = file.type || null;
      }

      await add.mutateAsync({
        course_id:      activeCourse,
        uploaded_by:    user!.id,
        title:          form.title.trim(),
        description:    form.description.trim() || null,
        external_link:  form.external_link.trim() || null,
        material_type:  form.material_type,
        due_date:       form.due_date || null,
        is_visible:     true,
        allow_download: form.allow_download,
        storage_path, file_name, file_size, mime_type,
      });

      toast({ title: "Material added" });
      setForm(BLANK); setFile(null); setShowForm(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (m: any) => {
    await del.mutateAsync({ id: m.id, storagePath: m.storage_path, courseId: activeCourse });
    toast({ title: "Material removed" });
  };

  const handleToggleDownload = async (m: any) => {
    await toggle.mutateAsync({ id: m.id, allow_download: !m.allow_download, courseId: activeCourse });
    toast({ title: !m.allow_download ? "Downloads enabled" : "Downloads disabled" });
  };

  const handleOpen = async (m: any, asDownload: boolean) => {
    if (!m.storage_path) {
      if (m.external_link) window.open(m.external_link, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.functions.invoke("get-material-download", {
      body: { materialId: m.id, mode: asDownload ? "download" : "preview" },
    });
    if (error || !data?.url) {
      toast({ title: "Could not open file", description: error?.message ?? "", variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank", "noopener");
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Materials</h1>
            <p className="text-slate-500 text-sm mt-1">Upload files, link videos/audio, and control downloads.</p>
          </div>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>

        <select value={activeCourse} onChange={(e) => setCourseId(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[220px]">
          {courses.length === 0 && <option value="">No courses assigned</option>}
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

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
                  <option value="audio">Audio</option>
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

            {!isLinkType && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Upload File {file && <span className="text-emerald-600 font-normal">— {file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span>}
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{file ? "Choose a different file" : `Choose a file (max ${MAX_MB}MB)`}</span>
                  <input type="file" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                {isLinkType ? "Link URL *" : "Or paste an External Link (YouTube, Drive, audio…)"}
              </label>
              <input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                required={isLinkType}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://…" />
            </div>

            {form.material_type === "homework" && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Due Date</label>
                <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.allow_download}
                onChange={(e) => setForm({ ...form, allow_download: e.target.checked })}
                className="mt-0.5 accent-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-slate-800">Allow students to download</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  If off, students can only preview the file in their browser. Instructors and admins can always download.
                </div>
              </div>
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={uploading || add.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {(uploading || add.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {uploading ? "Uploading…" : "Add"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFile(null); }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : materials.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No materials uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m: any) => {
              const Icon = TYPE_ICON[m.material_type as MaterialType] ?? FileText;
              const color = TYPE_COLOR[m.material_type as MaterialType] ?? "bg-slate-50 text-slate-600";
              const hasFile = !!m.storage_path;
              return (
                <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">{m.title}</div>
                    {m.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</div>}
                    <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-400">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100">{m.material_type}</span>
                      {hasFile && (
                        <span className={`px-2 py-0.5 rounded-full font-medium ${m.allow_download ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {m.allow_download ? "Downloads on" : "Preview only"}
                        </span>
                      )}
                      {m.due_date && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3 h-3" /> Due {new Date(m.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {hasFile ? (
                        <button onClick={() => handleOpen(m, true)}
                          className="text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
                          <Download className="w-3 h-3" /> Open file
                        </button>
                      ) : m.external_link ? (
                        <a href={m.external_link} target="_blank" rel="noopener noreferrer"
                          className="text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Open link
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {hasFile && (
                    <button onClick={() => handleToggleDownload(m)} disabled={toggle.isPending}
                      title={m.allow_download ? "Disable student downloads" : "Allow student downloads"}
                      className={`shrink-0 p-2 rounded-lg transition-colors ${m.allow_download ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}>
                      {m.allow_download ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => handleDelete(m)} disabled={del.isPending}
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
