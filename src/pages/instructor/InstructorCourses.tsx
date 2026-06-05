import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, Video, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";

function useMyAssignedCourses() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["instructor-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: assignments, error } = await (supabase
        .from("ssra_instructor_assignments" as never) as any)
        .select("course_id, assigned_at, ssra_courses(id, title, category, course_type, start_date, enrolled_count, capacity)")
        .eq("instructor_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;

      return ((assignments ?? []) as any[]).map((a: any) => ({
        assignedAt: a.assigned_at,
        ...a.ssra_courses,
      }));
    },
  });
}

function useStudentCountByCourse(courseIds: string[]) {
  return useQuery({
    queryKey: ["instructor-student-counts", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("status", "active");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const e of data ?? []) {
        if (!e.course_id) continue;
        counts[e.course_id] = (counts[e.course_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

export default function InstructorCourses() {
  const { data: courses = [], isLoading } = useMyAssignedCourses();
  const courseIds = courses.map((c: any) => c.id);
  const { data: studentCounts = {} } = useStudentCountByCourse(courseIds);

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 text-sm mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""} assigned to you.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No courses assigned yet</h3>
            <p className="text-sm text-slate-500 mt-1">Contact your admin to get assigned to a course.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((course: any) => (
              <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 capitalize">
                    {course.category}
                  </span>
                </div>

                <h3 className="font-display font-bold text-slate-900 mb-1">{course.title}</h3>

                {course.start_date && (
                  <p className="text-xs text-slate-400 mb-4">
                    Batch start: {new Date(course.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {studentCounts[course.id] ?? 0} students
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" />
                    {course.course_type ?? course.type ?? "online"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/instructor/students?course=${course.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" /> Students
                  </Link>
                  <Link
                    to={`/instructor/attendance?course=${course.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Attendance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorLayout>
  );
}
