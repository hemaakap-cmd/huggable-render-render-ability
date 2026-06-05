import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, Video, Calendar, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import InstructorLayout from "@/components/ssra/InstructorLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";

function useInstructorStats() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["instructor-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [assignments, upcoming] = await Promise.all([
        supabase
          .from("ssra_instructor_assignments" as never)
          .select("course_id")
          .eq("instructor_id", user!.id)
          .eq("is_active", true),
        supabase
          .from("ssra_sessions")
          .select("id, title, scheduled_at, course_id, ssra_courses(title)")
          .eq("is_cancelled", false)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);

      const courseIds = ((assignments.data ?? []) as any[]).map((a: any) => a.course_id);

      const [students] = await Promise.all([
        courseIds.length > 0
          ? supabase
              .from("ssra_enrollments")
              .select("user_id", { count: "exact", head: true })
              .in("course_id", courseIds)
              .eq("status", "active")
          : Promise.resolve({ count: 0 }),
      ]);

      const upcomingFiltered = ((upcoming.data ?? []) as any[]).filter((s: any) =>
        courseIds.includes(s.course_id),
      );

      return {
        courseCount:   courseIds.length,
        studentCount:  students.count ?? 0,
        upcomingSessions: upcomingFiltered,
        courseIds,
      };
    },
  });
}

export default function InstructorDashboard() {
  const { profile } = useSsraAuth();
  const { data: stats, isLoading } = useInstructorStats();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <InstructorLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {greeting}, {profile?.full_name?.split(" ")[0] ?? "Instructor"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's your teaching overview for today.</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, label: "Assigned Courses", value: isLoading ? "…" : stats?.courseCount ?? 0, color: "text-emerald-600 bg-emerald-50" },
            { icon: Users,    label: "Total Students",   value: isLoading ? "…" : stats?.studentCount ?? 0, color: "text-blue-600 bg-blue-50" },
            { icon: Video,    label: "Upcoming Sessions", value: isLoading ? "…" : stats?.upcomingSessions.length ?? 0, color: "text-purple-600 bg-purple-50" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Upcoming Sessions</h2>
            <Link to="/instructor/sessions" className="text-xs text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
              All sessions <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
          ) : (stats?.upcomingSessions.length ?? 0) === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats!.upcomingSessions.map((s: any) => {
                const dt = new Date(s.scheduled_at);
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{s.title}</div>
                      <div className="text-xs text-slate-400">{(s.ssra_courses as any)?.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "Mark Attendance",     href: "/instructor/attendance", icon: CheckCircle2 },
              { label: "Upload Materials",    href: "/instructor/materials",  icon: BookOpen },
              { label: "View My Students",    href: "/instructor/students",   icon: Users },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <Icon className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </InstructorLayout>
  );
}
