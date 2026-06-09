import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen, Loader2, FileText, Video, Music, BookOpen,
  Link as LinkIcon, Download, Eye, Lock,
} from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
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

function useMyMaterials() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["student-materials", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_materials" as never) as any)
        .select("*, ssra_courses(id, title)")
        .eq("is_visible", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export default function MyMaterials() {
  const { data: materials = [], isLoading } = useMyMaterials();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const open = async (m: any, asDownload: boolean) => {
    if (!m.storage_path) {
      if (m.external_link) window.open(m.external_link, "_blank", "noopener");
      return;
    }
    setLoadingId(m.id + (asDownload ? ":d" : ":p"));
    try {
      const { data, error } = await supabase.functions.invoke("get-material-download", {
        body: { materialId: m.id, mode: asDownload ? "download" : "preview" },
      });
      if (error || !data?.url) throw error ?? new Error("Failed");
      window.open(data.url, "_blank", "noopener");
    } catch (e: any) {
      toast({ title: "Could not open", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  // Group by course
  const byCourse: Record<string, { title: string; items: any[] }> = {};
  for (const m of materials) {
    const key = m.course_id ?? "other";
    const title = m.ssra_courses?.title ?? "Other";
    if (!byCourse[key]) byCourse[key] = { title, items: [] };
    byCourse[key].items.push(m);
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Course Materials</h1>
          <p className="text-slate-500 text-sm mt-1">
            Files and links shared by your instructors. Some files are preview-only — download is enabled by your instructor.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : materials.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No materials shared yet.</p>
          </div>
        ) : (
          Object.entries(byCourse).map(([cid, { title, items }]) => (
            <div key={cid} className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 px-1">{title}</h2>
              <div className="space-y-2">
                {items.map((m) => {
                  const Icon = TYPE_ICON[m.material_type as MaterialType] ?? FileText;
                  const color = TYPE_COLOR[m.material_type as MaterialType] ?? "bg-slate-50 text-slate-600";
                  const hasFile = !!m.storage_path;
                  const canDownload = !!m.allow_download;
                  return (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 text-sm">{m.title}</div>
                        {m.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</div>}
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          {hasFile ? (
                            <>
                              <button onClick={() => open(m, false)} disabled={loadingId === m.id + ":p"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
                                {loadingId === m.id + ":p" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                Preview
                              </button>
                              {canDownload ? (
                                <button onClick={() => open(m, true)} disabled={loadingId === m.id + ":d"}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                                  {loadingId === m.id + ":d" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                  Download
                                </button>
                              ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                                  <Lock className="w-3 h-3" /> Download disabled
                                </span>
                              )}
                            </>
                          ) : m.external_link ? (
                            <a href={m.external_link} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(220,91%,54%)] hover:bg-[hsl(220,91%,48%)] text-white text-xs font-semibold">
                              <LinkIcon className="w-3 h-3" /> Open Link
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
