import { Link, Navigate } from "react-router-dom";
import {
  BookOpen, CreditCard, ArrowRight, Crown, Video, Calendar, PlayCircle, GraduationCap,
  FolderOpen, BookCheck, Award, User,
} from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyEnrollments, useMySubscription, useMyProfile, useMyUpcomingSessions, useCourseSchedule } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { resolveCourseMeta, nextSessionDate, formatCourseDate, type CourseMeta } from "@/lib/courseDefaults";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" });
}

function CourseHero({
  meta, hasActiveSubscription, nextSessionISO,
}: {
  meta: CourseMeta;
  hasActiveSubscription: boolean;
  nextSessionISO: string | null;
}) {
  const session = nextSessionISO ? new Date(nextSessionISO) : nextSessionDate(meta);
  return (
    <div className="rounded-2xl p-7 text-white relative overflow-hidden bg-gradient-to-br from-[hsl(222,47%,9%)] via-[hsl(220,60%,18%)] to-[hsl(220,91%,24%)]">
      <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-semibold uppercase tracking-widest text-white/70">
            <GraduationCap className="w-3 h-3" /> Current Course
          </span>
          {hasActiveSubscription && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-300/30 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
              Active
            </span>
          )}
        </div>

        <h2 className="font-display text-3xl font-bold mb-2">{meta.title}</h2>
        <p className="text-white/60 text-sm mb-6">
          Starts {formatCourseDate(new Date(meta.startDateISO + "T00:00:00"))} · {meta.cadence} at {meta.startTime} {meta.timezoneLabel}
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-white/8 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Instructor</div>
            <div className="text-sm font-semibold">{meta.instructor}</div>
          </div>
          <div className="rounded-xl bg-white/8 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Total Duration</div>
            <div className="text-sm font-semibold">{meta.durationLabel}</div>
          </div>
          <div className="rounded-xl bg-white/8 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Next Session</div>
            <div className="text-sm font-semibold">
              {session.toLocaleDateString("en-DE", { day: "numeric", month: "short" })} · {meta.startTime}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
            <span>Progress</span>
            <span>Lesson 0 of {meta.totalLessons}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: "0%" }} />
          </div>
          <div className="text-[11px] text-white/40 mt-1.5">Lessons unlock as the course begins.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/materials" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors">
            <PlayCircle className="w-4 h-4" /> Start Learning
          </Link>
          <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/15 transition-colors">
            <Video className="w-4 h-4" /> Join Live Session
          </Link>
          <Link to="/dashboard/subscription" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors">
            <CreditCard className="w-4 h-4" /> Manage Subscription
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { isInstructor, isAdmin, isSuperAdmin, loading: authLoading } = useSsraAuth();
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: subscription }     = useMySubscription();
  const { data: profile }          = useMyProfile();
  const { data: upcomingSessions = [] } = useMyUpcomingSessions();

  // Pick the primary course to feature (subscription wins, otherwise first enrollment).
  const primaryCourseId: string =
    (subscription as any)?.course_id ??
    (enrollments as any[])[0]?.course_id ??
    "medical-german";
  const { data: scheduleRow } = useCourseSchedule(primaryCourseId);

  if (!authLoading && (isAdmin || isSuperAdmin)) return <Navigate to="/ssra-admin" replace />;
  if (!authLoading && isInstructor)              return <Navigate to="/instructor" replace />;

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";
  const hasAnyCourse = hasActiveSubscription || (enrollments as any[]).length > 0;
  const nextSession: any = (upcomingSessions as any[])[0] ?? null;
  const meta = resolveCourseMeta(primaryCourseId, scheduleRow ?? null);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's your learning overview.</p>
        </div>

        {hasAnyCourse ? (
          <CourseHero
            meta={meta}
            hasActiveSubscription={hasActiveSubscription}
            nextSessionISO={nextSession?.scheduled_at ?? null}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Crown className="w-10 h-10 text-[hsl(43,96%,50%)] mx-auto mb-3" />
            <div className="font-display text-xl font-bold text-slate-900 mb-1">Start your journey</div>
            <p className="text-sm text-slate-500 mb-5">Browse our programmes and enrol to unlock your dashboard.</p>
            <Link to="/courses" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold">
              Browse Courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Next session + Subscription summary */}
        {hasAnyCourse && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Video className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Next Session</div>
              </div>
              <div className="font-semibold text-slate-900">{nextSession?.title ?? meta.title}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {nextSession
                  ? `${new Date(nextSession.scheduled_at).toLocaleDateString("en-DE", { weekday: "short", day: "numeric", month: "short" })} · ${new Date(nextSession.scheduled_at).toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" })}`
                  : `${formatCourseDate(new Date(meta.startDateISO + "T00:00:00"))} · ${meta.startTime} ${meta.timezoneLabel}`}
              </div>
              <Link to="/dashboard/sessions" className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-[hsl(220,91%,54%)] hover:underline">
                View all sessions <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subscription</div>
              </div>
              <div className="font-semibold text-slate-900">
                {hasActiveSubscription ? "Active · monthly support" : "Not active"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {hasActiveSubscription
                  ? <>Next billing date: <strong className="text-slate-700">{fmtDate(subscription?.current_period_end)}</strong></>
                  : "Choose your monthly support to continue learning."}
              </div>
              <Link to="/dashboard/subscription" className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-[hsl(220,91%,54%)] hover:underline">
                Manage subscription <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Quick links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: FolderOpen, label: "Materials",    href: "/dashboard/materials" },
              { icon: BookCheck,  label: "Homework",     href: "/dashboard/homework" },
              { icon: Award,      label: "Certificates", href: "/dashboard/certificates" },
              { icon: User,       label: "Profile",      href: "/dashboard/profile" },
            ].map(({ icon: Icon, label, href }) => (
              <Link key={href} to={href}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-[hsl(220,91%,54%)]/40 hover:shadow-sm transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Browse more */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-800 text-sm">Looking for more courses?</div>
            <div className="text-xs text-slate-500 mt-0.5">Explore our full catalogue.</div>
          </div>
          <Link to="/courses" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] transition-colors">
            <BookOpen className="w-4 h-4" /> Browse
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
