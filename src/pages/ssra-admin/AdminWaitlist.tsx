import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Users, CheckCircle2, XCircle, Bell, Loader2, RefreshCw, Trash2 } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WaitlistEntry = {
  id: string;
  user_id: string;
  course_id: string;
  position: number;
  status: string;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  ssra_profiles: { full_name: string | null; email: string | null } | null;
  ssra_courses:  { title: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  waiting:   "bg-amber-50 text-amber-700 border-amber-200",
  notified:  "bg-blue-50 text-blue-700 border-blue-200",
  converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired:   "bg-slate-100 text-slate-500 border-slate-200",
  removed:   "bg-red-50 text-red-600 border-red-200",
};

function useAdminWaitlist(courseFilter: string) {
  return useQuery({
    queryKey: ["ssra-admin-waitlist", courseFilter],
    queryFn: async () => {
      let q = supabase
        .from("ssra_waitlist" as never)
        .select("*, ssra_profiles(full_name, email), ssra_courses(title)")
        .order("course_id", { ascending: true })
        .order("position",  { ascending: true });
      if (courseFilter) q = (q as any).eq("course_id", courseFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaitlistEntry[];
    },
  });
}

function useAdminCourseList() {
  return useQuery({
    queryKey: ["ssra-courses-simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ssra_courses").select("id, title").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useUpdateWaitlistStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("ssra_waitlist" as never) as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-waitlist"] }),
  });
}

function useRemoveFromWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("ssra_waitlist" as never) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-waitlist"] }),
  });
}

export default function AdminWaitlist() {
  const [courseFilter, setCourseFilter] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useAdminWaitlist(courseFilter);
  const { data: courses  = [] }           = useAdminCourseList();
  const updateStatus = useUpdateWaitlistStatus();
  const remove       = useRemoveFromWaitlist();

  const grouped = entries.reduce<Record<string, WaitlistEntry[]>>((acc, e) => {
    const key = e.course_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const notify = async (entry: WaitlistEntry) => {
    await updateStatus.mutateAsync({ id: entry.id, status: "notified" });
    toast({ title: "Marked as notified", description: `${entry.ssra_profiles?.full_name ?? entry.ssra_profiles?.email} notified` });
  };

  const convert = async (entry: WaitlistEntry) => {
    await updateStatus.mutateAsync({ id: entry.id, status: "converted" });
    toast({ title: "Marked as converted" });
  };

  const del = async (entry: WaitlistEntry) => {
    await remove.mutateAsync(entry.id);
    toast({ title: "Removed from waitlist" });
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Waitlist Management</h1>
            <p className="text-slate-500 text-sm mt-1">
              {entries.length} student{entries.length !== 1 ? "s" : ""} waiting across all courses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All courses</option>
              {(courses as any[]).map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["ssra-admin-waitlist"] })}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No waitlist entries</h3>
            <p className="text-sm text-slate-500 mt-1">Students will appear here when courses are full.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cid, list]) => (
            <div key={cid} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-800 text-sm">
                    {list[0]?.ssra_courses?.title ?? cid}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">{list.length} waiting</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {list.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-sm shrink-0">
                        {e.position}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {e.ssra_profiles?.full_name ?? "—"}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{e.ssra_profiles?.email ?? "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[e.status] ?? STATUS_COLOR.waiting}`}>
                        {e.status}
                      </span>

                      <div className="flex items-center gap-1">
                        {e.status === "waiting" && (
                          <button
                            onClick={() => notify(e)}
                            title="Mark notified"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                        )}
                        {(e.status === "waiting" || e.status === "notified") && (
                          <button
                            onClick={() => convert(e)}
                            title="Mark converted"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => del(e)}
                          title="Remove from waitlist"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-slate-400 w-20 text-right">
                        {new Date(e.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
