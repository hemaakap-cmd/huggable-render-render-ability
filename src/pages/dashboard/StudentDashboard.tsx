import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CreditCard, Clock, ArrowRight, Crown, Video, Calendar, Bell } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyEnrollments, useMySubscription, useMyProfile, useMyUpcomingSessions } from "@/hooks/useSsraData";

function useCountdown(target: string | null) {
  const [ms, setMs] = useState(() => (target ? new Date(target).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!target) return;
    const tick = () => setMs(new Date(target).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return ms;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Live now";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold font-display ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function NextSessionBanner({ session }: { session: { title: string; scheduled_at: string; ssra_courses?: { title: string } | null } }) {
  const ms = useCountdown(session.scheduled_at);
  const isLive = ms <= 0;
  const isImminent = ms > 0 && ms < 15 * 60 * 1000;

  return (
    <div className={`rounded-2xl p-5 ${isLive ? "bg-emerald-600" : isImminent ? "bg-amber-500" : "bg-hero"} text-white relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLive ? "bg-white/20" : "bg-white/15"}`}>
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-0.5 flex items-center gap-1.5">
              <Bell className="w-3 h-3" />
              {isLive ? "Session is live!" : "Next session"}
            </div>
            <div className="font-semibold truncate">{session.title}</div>
            <div className="text-xs text-white/60 mt-0.5">{session.ssra_courses?.title}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`font-mono font-bold text-xl tabular-nums ${isLive ? "animate-pulse" : ""}`}>
            {formatCountdown(ms)}
          </div>
          <Link to="/dashboard/sessions">
            <button className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-lg">
              {isLive || isImminent ? "Join Now" : "View Details"}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { data: enrollments = [], isLoading: eLoading }     = useMyEnrollments();
  const { data: subscription, isLoading: sLoading }         = useMySubscription();
  const { data: profile }                                   = useMyProfile();
  const { data: upcomingSessions = [] }                     = useMyUpcomingSessions();

  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";
  const nextSession = (upcomingSessions as any[])[0] ?? null;

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

        {/* Next session countdown banner */}
        {nextSession && <NextSessionBanner session={nextSession} />}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Courses enrolled"   value={eLoading ? "…" : enrollments.length} color="text-[hsl(220,91%,54%)]" />
          <StatCard label="Subscription"
            value={sLoading ? "…" : hasActiveSubscription ? "Active" : "None"}
            sub={hasActiveSubscription ? "Medical German" : "€19/mo available"}
            color={hasActiveSubscription ? "text-emerald-600" : "text-slate-400"} />
          <StatCard label="Upcoming sessions"  value={(upcomingSessions as any[]).length} sub="Your courses only" color="text-purple-600" />
        </div>

        {/* Active subscription card */}
        {hasActiveSubscription && subscription && (
          <div className="bg-hero rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/15 blur-2xl" />
            <div className="flex items-start justify-between relative">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-[hsl(43,96%,50%)]" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Active Subscription</span>
                </div>
                <div className="font-display text-xl font-bold">{(subscription as any).ssra_courses?.title}</div>
                <div className="text-white/55 text-sm mt-1">
                  Renews {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </div>
              </div>
              <Link to="/dashboard/subscription">
                <button className="text-xs font-semibold text-white/70 border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  Manage
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Enrolled courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">My Enrolled Courses</h2>
            <Link to="/dashboard/courses" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {enrollments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <div className="text-slate-500 text-sm mb-4">No courses yet.</div>
              <Link to="/courses">
                <button className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
                  Browse Courses
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {enrollments.slice(0, 4).map((e: any) => (
                <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">
                      {e.ssra_courses?.title ?? "Course"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Enrolled {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming sessions list — only courses user has access to, no direct Zoom links */}
        {(upcomingSessions as any[]).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Upcoming Sessions</h2>
              <Link to="/dashboard/sessions" className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {(upcomingSessions as any[]).slice(0, 3).map((s: any) => {
                const d = new Date(s.scheduled_at);
                const dateStr = d.toLocaleDateString("en-DE", { weekday: "short", day: "numeric", month: "short" });
                const timeStr = d.toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={s.id} className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{s.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {dateStr} · {timeStr} · {s.duration_minutes} min
                      </div>
                    </div>
                    <Link to="/dashboard/sessions"
                      className="flex items-center gap-1 text-xs font-semibold text-[hsl(220,91%,54%)] border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0">
                      <Clock className="w-3 h-3" /> Join
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: BookOpen,   label: "Browse Courses",     href: "/courses",                color: "bg-blue-50 text-[hsl(220,91%,54%)]" },
              ...(hasActiveSubscription || enrollments.length > 0
                ? [{ icon: Video,  label: "Live Sessions",      href: "/dashboard/sessions",    color: "bg-emerald-50 text-emerald-600" }]
                : [{ icon: Crown,  label: "Subscribe to German", href: "/pricing",               color: "bg-amber-50 text-amber-600" }]
              ),
              { icon: CreditCard, label: "Manage Billing",      href: "/dashboard/subscription", color: "bg-slate-100 text-slate-600" },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={href} to={href}
                className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-3 hover:border-[hsl(220,91%,54%)]/40 hover:shadow-md transition-all group">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-[hsl(220,91%,54%)] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
