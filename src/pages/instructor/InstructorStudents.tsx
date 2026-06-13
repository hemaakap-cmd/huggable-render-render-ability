import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Loader2, Globe2 } from "lucide-react";

import { useSearchParams } from "react-router-dom";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";

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

function useInstructorStudents(courseId: string) {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["instructor-students", user?.id, courseId],
    enabled: !!user && !!courseId,
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from("ssra_enrollments")
        .select("user_id, enrolled_at, status")
        .eq("course_id", courseId)
        .eq("status", "active");
      if (error) throw error;

      const ids = (enrollments ?? []).map((e) => e.user_id).filter(Boolean) as string[];
      if (ids.length === 0) return [];

      const { data: profiles } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, country")
        .in("id", ids);


      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (enrollments ?? []).map((e) => ({
        ...e,
        profile: e.user_id ? profileMap.get(e.user_id) ?? null : null,
      }));
    },
  });
}

export default function InstructorStudents() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const { data: courses = [] } = useMyCoursesSimple();
  const firstCourse = courses[0]?.id ?? "";
  const courseId = params.get("course") || firstCourse;

  const { data: students = [], isLoading } = useInstructorStudents(courseId);

  const filtered = students.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.profile?.country?.toLowerCase().includes(q)
    );
  });


  return (
    <InstructorLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">My Students</h1>
            <p className="text-slate-500 text-sm mt-1">{filtered.length} student{filtered.length !== 1 ? "s" : ""} enrolled.</p>
          </div>
          <select
            value={courseId}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("course", e.target.value);
              window.history.pushState({}, "", url.toString());
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(courses as any[]).map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or country…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

        </div>

        {!courseId ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Select a course to view students.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No students found.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Student</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Country</th>
                  <th className="text-left px-5 py-3">Phone</th>
                  <th className="text-left px-5 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s: any) => (
                  <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                          {(s.profile?.full_name ?? s.profile?.email ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{s.profile?.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <a href={`mailto:${s.profile?.email}`} className="flex items-center gap-1 text-slate-500 hover:text-[hsl(220,91%,54%)]">
                        <Mail className="w-3.5 h-3.5" /> {s.profile?.email ?? "—"}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Globe2 className="w-3.5 h-3.5" /> {s.profile?.country ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.profile?.phone_number ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
