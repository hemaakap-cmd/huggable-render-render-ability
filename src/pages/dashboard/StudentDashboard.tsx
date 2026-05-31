import { Link } from "react-router-dom";
import { BookOpen, CreditCard, Clock, ArrowRight, CheckCircle2, AlertCircle, Crown, Video, ExternalLink, Calendar } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyEnrollments, useMySubscription, useMyVerification, useMyProfile, useUpcomingSessions } from "@/hooks/useSsraData";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold font-display ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function StudentDashboard() {
  const { data: enrollments = [], isLoading: eLoading }  = useMyEnrollments();
  const { data: subscription, isLoading: sLoading }      = useMySubscription();
  const { data: verification }                           = useMyVerification();
  const { data: profile }                                = useMyProfile();
  const { data: upcomingSessions = [] }                  = useUpcomingSessions();

  const isVerified   = verification?.status === "approved";
  const isPending    = verification?.status === "pending";
  const hasActiveSubscription = subscription?.status === "active" || subscription?.status === "trialing";

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

        {/* Verification banner */}
        {!isVerified && !isPending && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-amber-800">Student verification required</div>
              <div className="text-xs text-amber-700 mt-0.5">Complete verification to access the Medical German subscription course.</div>
            </div>
            <Link to="/apply">
              <button className="text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
                Apply now
              </button>
            </Link>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-blue-800">Verification under review</div>
              <div className="text-xs text-blue-700 mt-0.5">We'll email you within 24–48 hours.</div>
            </div>
          </div>
        )}

        {isVerified && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm font-semibold text-emerald-800">Student status verified ✓</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Courses enrolled"   value={eLoading ? "…" : enrollments.length} color="text-[hsl(220,91%,54%)]" />
          <StatCard label="Subscription"
            value={sLoading ? "…" : hasActiveSubscription ? "Active" : "None"}
            sub={hasActiveSubscription ? "Medical German" : "€29/mo available"}
            color={hasActiveSubscription ? "text-emerald-600" : "text-slate-400"} />
          <StatCard label="Verification"
            value={isVerified ? "Approved" : isPending ? "Pending" : "Required"}
            color={isVerified ? "text-emerald-600" : isPending ? "text-amber-600" : "text-slate-400"} />
          <StatCard label="Courses available" value="9" sub="Browse catalogue" color="text-slate-700" />
        </div>

        {/* Active subscription */}
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

        {/* Upcoming Zoom sessions — only shown for active subscribers */}
        {hasActiveSubscription && (upcomingSessions as any[]).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Upcoming Zoom Sessions</h2>
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
                    <a href={s.zoom_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold text-[hsl(220,91%,54%)] border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0">
                      <ExternalLink className="w-3 h-3" /> Join
                    </a>
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
              ...(hasActiveSubscription
                ? [{ icon: Video,       label: "Live Sessions",      href: "/dashboard/sessions",    color: "bg-emerald-50 text-emerald-600" }]
                : [{ icon: Crown,      label: "Subscribe to German", href: "/pricing",               color: "bg-amber-50 text-amber-600" }]
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
