import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, Calendar, Users, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

function useCourseSessions(courseId: string) {
  return useQuery({
    queryKey: ["instructor-sessions", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, title, scheduled_at, duration_minutes")
        .eq("course_id", courseId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCourseStudents(courseId: string) {
  return useQuery({
    queryKey: ["instructor-course-students", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("ssra_enrollments")
        .select("user_id")
        .eq("course_id", courseId)
        .eq("status", "active");
      const ids = (enrollments ?? []).map((e) => e.user_id).filter(Boolean) as string[];
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return profiles ?? [];
    },
  });
}

function useSessionAttendanceMap(sessionId: string) {
  return useQuery({
    queryKey: ["instructor-attendance", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ssra_session_attendance")
        .select("user_id")
        .eq("session_id", sessionId);
      return new Set((data ?? []).map((a) => a.user_id));
    },
  });
}

function useToggleAttendance(sessionId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, attended }: { userId: string; attended: boolean }) => {
      if (attended) {
        await supabase.from("ssra_session_attendance")
          .upsert({ session_id: sessionId, user_id: userId }, { onConflict: "session_id,user_id" });
      } else {
        await supabase.from("ssra_session_attendance")
          .delete().eq("session_id", sessionId).eq("user_id", userId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instructor-attendance", sessionId] });
    },
  });
}

export default function InstructorAttendance() {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { data: courses = [] } = useMyCoursesSimple();
  const firstCourse = (courses as any[])[0]?.id ?? "";
  const courseId = params.get("course") || firstCourse;
  const { data: sessions = [] } = useCourseSessions(courseId);
  const { data: students = [] } = useCourseStudents(courseId);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const sessionId = selectedSession || (sessions as any[])[0]?.id || "";
  const { data: attendedSet = new Set<string>(), isLoading: attLoading } = useSessionAttendanceMap(sessionId);
  const toggle = useToggleAttendance(sessionId, courseId);

  const handleToggle = async (userId: string, currently: boolean) => {
    await toggle.mutateAsync({ userId, attended: !currently });
    toast({ title: !currently ? "Marked present" : "Marked absent" });
  };

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-slate-900">Attendance</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={courseId}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("course", e.target.value);
              window.history.pushState({}, "", url.toString());
              setSelectedSession("");
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(courses as any[]).map((c: any) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={sessionId}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="flex-1 min-w-48 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(sessions as any[]).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.title} — {new Date(s.scheduled_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        {sessionId && (
          <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="font-medium">
                {(sessions as any[]).find((s: any) => s.id === sessionId)?.title ?? "Session"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-emerald-600">{attendedSet.size}</span>
              <span>/ {students.length} present</span>
            </div>
          </div>
        )}

        {/* Student list */}
        {!sessionId ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Select a session to take attendance.</p>
          </div>
        ) : attLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No students enrolled in this course.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center justify-between">
              <span>Students ({students.length})</span>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {(students as any[]).map((student: any) => {
                const isPresent = attendedSet.has(student.id);
                return (
                  <div key={student.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {(student.full_name ?? student.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{student.full_name ?? "—"}</div>
                      <div className="text-xs text-slate-400 truncate">{student.email}</div>
                    </div>
                    <button
                      onClick={() => handleToggle(student.id, isPresent)}
                      disabled={toggle.isPending}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isPresent
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {isPresent
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Present</>
                        : <><XCircle className="w-3.5 h-3.5" /> Absent</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
