import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Eye, ArrowLeft, BookOpen, Video, CreditCard, User,
  CheckCircle2, AlertCircle, Clock, XCircle, Crown,
  Calendar, ExternalLink, Globe2, Mail, ShieldCheck,
  AlertTriangle, ClipboardList,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import {
  useStudentProfileById,
  useStudentEnrollmentsById,
  useStudentSubscriptionById,
  useStudentVerificationById,
  useStudentAttendanceById,
  useAdminSessions,
} from "@/hooks/useSsraData";
import { Navigate } from "react-router-dom";

type Tab = "overview" | "courses" | "sessions" | "subscription" | "profile" | "attendance";

const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview",     label: "Overview",     icon: Eye },
  { key: "courses",      label: "My Courses",   icon: BookOpen },
  { key: "sessions",     label: "Sessions",     icon: Video },
  { key: "subscription", label: "Subscription", icon: CreditCard },
  { key: "attendance",   label: "Attendance",   icon: ClipboardList },
  { key: "profile",      label: "Profile",      icon: User },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-DE", { day: "numeric", month: "short", year: "numeric" });
}
function fmtFull(d: string) {
  return new Date(d).toLocaleDateString("en-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SuperAdminViewAs() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useSsraAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: profile,      isLoading: pLoad  } = useStudentProfileById(userId ?? "");
  const { data: enrollments = [],                 } = useStudentEnrollmentsById(userId ?? "");
  const { data: subscription,                     } = useStudentSubscriptionById(userId ?? "");
  const { data: verification,                     } = useStudentVerificationById(userId ?? "");
  const { data: attendance  = [],                 } = useStudentAttendanceById(userId ?? "");
  const { data: allSessions = [],                 } = useAdminSessions();

  if (!loading && !isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  const hasActiveSub  = subscription?.status === "active" || subscription?.status === "trialing";
  const isVerified    = verification?.status === "approved";
  const isPending     = verification?.status === "pending";
  const isRejected    = verification?.status === "rejected";

  const now = new Date();
  const upcoming = (allSessions as any[]).filter(s => new Date(s.scheduled_at) >= now && !s.is_cancelled);
  const past     = (allSessions as any[]).filter(s => new Date(s.scheduled_at) <  now && !s.is_cancelled);

  if (pLoad) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Loading student data…</div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <div className="text-slate-700 font-semibold">Student not found</div>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-[hsl(220,91%,54%)] hover:underline">
            ← Go back
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Preview Banner ── */}
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber-50 border-2 border-amber-300">
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" /> Super Admin Preview Mode
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              You are viewing the dashboard as seen by
              <strong className="mx-1 text-amber-900">{profile.full_name ?? profile.email}</strong>
              — this is a <strong>read-only</strong> view.
            </div>
          </div>
          <button onClick={() => navigate("/ssra-admin/students")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-200 text-amber-900 text-sm font-semibold hover:bg-amber-300 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" /> Exit Preview
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ══════════════ OVERVIEW ══════════════ */}
        {tab === "overview" && (
          <div className="space-y-5">
            {/* Welcome */}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5">
              <div className="font-display text-xl font-bold text-slate-900">
                Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!
              </div>
              <div className="text-slate-500 text-sm mt-1">Here's your learning overview.</div>
            </div>

            {/* Verification status banner */}
            {!isVerified && !isPending && !isRejected && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-amber-800">Student verification required</div>
                  <div className="text-xs text-amber-700 mt-0.5">Complete verification to access the Medical German subscription course.</div>
                </div>
                <span className="ml-auto text-xs font-semibold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg bg-amber-100">
                  Apply now
                </span>
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
            {isRejected && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-red-800">Verification rejected</div>
                  {verification?.admin_notes && (
                    <div className="text-xs text-red-700 mt-0.5">Note: {verification.admin_notes}</div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Courses enrolled",  value: (enrollments as any[]).length, color: "text-[hsl(220,91%,54%)]" },
                { label: "Subscription",      value: hasActiveSub ? "Active" : "None",
                  sub: hasActiveSub ? "Medical German" : "€29/mo available",
                  color: hasActiveSub ? "text-emerald-600" : "text-slate-400" },
                { label: "Verification",
                  value: isVerified ? "Approved" : isPending ? "Pending" : isRejected ? "Rejected" : "Required",
                  color: isVerified ? "text-emerald-600" : isPending ? "text-amber-600" : isRejected ? "text-red-500" : "text-slate-400" },
                { label: "Sessions attended", value: (attendance as any[]).length, color: "text-purple-600" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className={`text-2xl font-bold font-display ${color}`}>{value}</div>
                  {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
                </div>
              ))}
            </div>

            {/* Active subscription card */}
            {hasActiveSub && subscription && (
              <div className="bg-hero rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/15 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-[hsl(43,96%,50%)]" />
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Active Subscription</span>
                  </div>
                  <div className="font-display text-xl font-bold">{(subscription as any).ssra_courses?.title}</div>
                  <div className="text-white/55 text-sm mt-1">
                    Renews {(subscription as any).current_period_end
                      ? new Date((subscription as any).current_period_end).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" })
                      : "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Enrolled courses preview */}
            {(enrollments as any[]).length > 0 && (
              <div>
                <div className="font-semibold text-slate-900 mb-3">Enrolled Courses</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {(enrollments as any[]).slice(0, 4).map((e: any) => (
                    <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{e.ssra_courses?.title ?? "—"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Enrolled {e.enrolled_at ? fmt(e.enrolled_at) : "—"}</div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming sessions */}
            {hasActiveSub && upcoming.length > 0 && (
              <div>
                <div className="font-semibold text-slate-900 mb-3">Upcoming Zoom Sessions</div>
                <div className="space-y-3">
                  {upcoming.slice(0, 3).map((s: any) => {
                    const d = new Date(s.scheduled_at);
                    return (
                      <div key={s.id} className="bg-white border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0">
                          <Video className="w-4 h-4 text-[hsl(220,91%,54%)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate">{s.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {d.toLocaleDateString("en-DE", { weekday: "short", day: "numeric", month: "short" })}
                            {" · "}{d.toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}{s.duration_minutes} min
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-[hsl(220,91%,54%)] border border-blue-200 px-3 py-1.5 rounded-lg bg-blue-50 shrink-0">
                          <ExternalLink className="w-3 h-3" /> Join
                          <span className="text-[10px] text-slate-400 ml-1">(preview)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ COURSES ══════════════ */}
        {tab === "courses" && (
          <div className="space-y-5">
            {hasActiveSub && subscription && (
              <div className="bg-gradient-to-r from-[hsl(220,91%,54%)] to-[hsl(220,91%,44%)] rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-white/70" />
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Active Subscription</span>
                </div>
                <div className="font-display text-xl font-bold">{(subscription as any).ssra_courses?.title ?? "Medical German"}</div>
                <div className="text-white/60 text-sm mt-1">
                  Renews {(subscription as any).current_period_end
                    ? new Date((subscription as any).current_period_end).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </div>
              </div>
            )}

            <div>
              <div className="font-semibold text-slate-900 mb-4">
                One-time Enrollments
                <span className="ml-2 text-sm font-normal text-slate-400">({(enrollments as any[]).length})</span>
              </div>

              {(enrollments as any[]).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                  <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <div className="text-slate-500 text-sm">No one-time enrollments yet.</div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {(enrollments as any[]).map((e: any) => (
                    <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[hsl(220,91%,54%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">{e.ssra_courses?.title ?? "—"}</div>
                          <div className="text-xs text-slate-400 mt-0.5 capitalize">{e.ssra_courses?.category} course</div>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Active</span>
                            <span className="text-xs text-slate-400">Enrolled {e.enrolled_at ? fmt(e.enrolled_at) : "—"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ SESSIONS ══════════════ */}
        {tab === "sessions" && (
          <div className="space-y-6">
            {!hasActiveSub && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                This student has no active subscription — they cannot see live sessions.
              </div>
            )}

            {/* Upcoming */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-slate-900 text-sm">Upcoming Sessions</span>
                <span className="text-xs text-slate-400 ml-auto">{upcoming.length} scheduled</span>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">No upcoming sessions.</div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s: any) => <SessionCard key={s.id} s={s} />)}
                </div>
              )}
            </div>

            {/* Past */}
            {past.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="font-semibold text-slate-900 text-sm">Past Sessions</span>
                  <span className="text-xs text-slate-400 ml-auto">{past.length} sessions</span>
                </div>
                <div className="space-y-3">
                  {past.map((s: any) => <SessionCard key={s.id} s={s} isPast />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ SUBSCRIPTION ══════════════ */}
        {tab === "subscription" && (
          <div className="max-w-2xl space-y-5">
            {!subscription ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <Crown className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <div className="text-slate-500 text-sm font-medium">No active subscription</div>
                <div className="text-slate-400 text-xs mt-1">This student hasn't subscribed yet.</div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-bold text-slate-900">{(subscription as any).ssra_courses?.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Medical German Subscription</div>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {[
                    { label: "Status",       value: subscription.status },
                    { label: "Period start", value: (subscription as any).current_period_start ? fmt((subscription as any).current_period_start) : "—" },
                    { label: "Period end",   value: (subscription as any).current_period_end   ? fmt((subscription as any).current_period_end)   : "—" },
                    { label: "Stripe ID",    value: (subscription as any).stripe_subscription_id ? (subscription as any).stripe_subscription_id.slice(0, 20) + "…" : "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                      <div className="text-sm text-slate-800 mt-0.5 font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-slate-900 text-sm">Verification Status</span>
              </div>
              {!verification ? (
                <div className="text-slate-400 text-sm">No verification submitted.</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={verification.status} />
                    <span className="text-xs text-slate-500">{verification.created_at ? fmt(verification.created_at) : ""}</span>
                  </div>
                  {verification.admin_notes && (
                    <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-600 italic">"{verification.admin_notes}"</div>
                  )}
                  {verification.reviewed_at && (
                    <div className="text-xs text-slate-400">Reviewed {fmt(verification.reviewed_at)}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ ATTENDANCE ══════════════ */}
        {tab === "attendance" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-slate-900 text-sm">Session Attendance</span>
              <span className="ml-auto text-xs text-slate-400">{(attendance as any[]).length} sessions attended</span>
            </div>
            {(attendance as any[]).length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No sessions attended yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(attendance as any[]).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {a.ssra_sessions?.title ?? "Session"}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {a.ssra_sessions?.ssra_courses?.title}
                        {a.ssra_sessions?.scheduled_at && ` · ${fmt(a.ssra_sessions.scheduled_at)}`}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      Joined {a.joined_at ? fmt(a.joined_at) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ PROFILE ══════════════ */}
        {tab === "profile" && (
          <div className="max-w-lg space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-2xl font-bold text-[hsl(220,91%,54%)]">
                  {profile.full_name?.[0] ?? profile.email?.[0] ?? "?"}
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-slate-900">{profile.full_name ?? "—"}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {profile.email}
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                {[
                  { label: "Full name",   value: profile.full_name ?? "—" },
                  { label: "Country",     value: (profile as any).country ?? "—", icon: Globe2 },
                  { label: "Degree",      value: (profile as any).degree ?? "—" },
                  { label: "Role",        value: profile.role ?? "student" },
                  { label: "Joined",      value: (profile as any).created_at ? fmt((profile as any).created_at) : "—" },
                  { label: "Last update", value: (profile as any).updated_at ? fmt((profile as any).updated_at) : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                    <div className="text-sm text-slate-800 mt-0.5 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
              This is a read-only preview. To edit this student's data use the Students panel.
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

/* ── helpers ── */

function SessionCard({ s, isPast = false }: { s: any; isPast?: boolean }) {
  const d = new Date(s.scheduled_at);
  return (
    <div className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row gap-4 ${
      isPast ? "border-slate-200 opacity-70" : "border-blue-100 shadow-sm"
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        isPast ? "bg-slate-100" : "bg-[hsl(220,91%,54%)]/10"
      }`}>
        <Video className={`w-5 h-5 ${isPast ? "text-slate-400" : "text-[hsl(220,91%,54%)]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm">{s.title}</div>
        <div className="text-xs text-slate-400 mt-0.5">{s.ssra_courses?.title}</div>
        {s.description && <div className="text-xs text-slate-500 mt-1.5 line-clamp-2">{s.description}</div>}
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {d.toLocaleDateString("en-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}{d.toLocaleTimeString("en-DE", { hour: "2-digit", minute: "2-digit" })}
          {" · "}{s.duration_minutes} min
        </div>
      </div>
      {!isPast && (
        <div className="shrink-0 flex items-start">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[hsl(220,91%,54%)] px-4 py-2 rounded-lg">
            <ExternalLink className="w-3.5 h-3.5" /> Join Zoom
            <span className="text-white/60 text-[10px] ml-1">(preview)</span>
          </span>
        </div>
      )}
    </div>
  );
}

const STATUS_MAP: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  trialing:  "bg-blue-50 text-blue-700 border-blue-200",
  past_due:  "bg-red-50 text-red-700 border-red-200",
  canceled:  "bg-slate-100 text-slate-500 border-slate-200",
  approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_MAP[status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
      {status}
    </span>
  );
}
