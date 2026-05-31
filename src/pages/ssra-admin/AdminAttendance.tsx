import { useState, useMemo } from "react";
import { Video, Users, CheckCircle2, Clock, ChevronDown, Search } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import {
  useAdminSessions, useSessionAttendance, useMarkAttendance,
  useAdminStudents,
} from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";

function AttendanceRate({ attended, total }: { attended: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((attended / total) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

export default function AdminAttendance() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading: sessionsLoading } = useAdminSessions();
  const { data: attendanceData = [], isLoading: attLoading }  = useSessionAttendance(selectedSession);
  const { data: allStudents = [] }                            = useAdminStudents("");
  const markAttendance = useMarkAttendance();

  const session = useMemo(
    () => (sessions as any[]).find((s) => s.id === selectedSession),
    [sessions, selectedSession],
  );

  /* Active subscribers — these are the students eligible for sessions */
  const activeSubscribers = useMemo(
    () => (allStudents as any[]).filter((s) => s.ssra_subscriptions?.[0]?.status === "active"),
    [allStudents],
  );

  const attendedIds = useMemo(
    () => new Set((attendanceData as any[]).map((a) => a.user_id)),
    [attendanceData],
  );

  const displayStudents = useMemo(() => {
    const base = activeSubscribers.length > 0 ? activeSubscribers : allStudents as any[];
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter((s) =>
      s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    );
  }, [activeSubscribers, allStudents, search]);

  async function handleToggle(userId: string, attended: boolean) {
    if (!selectedSession) return;
    await markAttendance.mutateAsync({ sessionId: selectedSession, userId, attended });
    toast({
      title: attended ? "Marked as attended" : "Removed attendance",
      description: attended ? "Student marked present." : "Attendance removed.",
    });
  }

  const sortedSessions = useMemo(
    () => [...(sessions as any[])].sort((a, b) =>
      new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    ),
    [sessions],
  );

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Session Attendance</h1>
          <p className="text-slate-500 text-sm mt-1">Select a session to view and mark student attendance.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Sessions list */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">Sessions</h2>
              </div>
              {sessionsLoading ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
              ) : sortedSessions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No sessions yet.</div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
                  {sortedSessions.map((s: any) => {
                    const isPast  = new Date(s.scheduled_at) < new Date();
                    const isSelected = s.id === selectedSession;
                    return (
                      <button key={s.id} onClick={() => setSelectedSession(s.id)}
                        className={`w-full text-left px-4 py-3.5 transition-all ${
                          isSelected
                            ? "bg-[hsl(220,91%,54%)]/8 border-l-2 border-[hsl(220,91%,54%)]"
                            : "hover:bg-slate-50 border-l-2 border-transparent"
                        }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={`text-sm font-medium truncate ${isSelected ? "text-[hsl(220,91%,54%)]" : "text-slate-800"}`}>
                              {s.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {new Date(s.scheduled_at).toLocaleDateString("en", {
                                weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {s.is_cancelled && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">
                                Cancelled
                              </span>
                            )}
                            {isPast && !s.is_cancelled && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Past</span>
                            )}
                            {!isPast && !s.is_cancelled && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Upcoming</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Attendance panel */}
          <div className="lg:col-span-3">
            {!selectedSession ? (
              <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-24 text-center px-6">
                <Video className="w-12 h-12 text-slate-200 mb-4" />
                <div className="text-slate-400 font-medium">Select a session</div>
                <div className="text-slate-300 text-sm mt-1">Choose a session from the list to manage attendance</div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">{session?.title ?? "Session"}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {session?.scheduled_at
                      ? new Date(session.scheduled_at).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </div>

                  {/* Attendance summary */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">Attendance Rate</span>
                      <span className="text-xs font-bold text-slate-700">
                        {attendedIds.size} / {displayStudents.length}
                      </span>
                    </div>
                    <AttendanceRate attended={attendedIds.size} total={displayStudents.length} />
                  </div>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search students…"
                      className="w-full pl-9 pr-4 h-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
                  </div>
                </div>

                {/* Student list */}
                {attLoading ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
                ) : displayStudents.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <div className="text-slate-400 text-sm">No active subscribers found.</div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
                    {displayStudents.map((s: any) => {
                      const isPresent = attendedIds.has(s.id);
                      return (
                        <div key={s.id}
                          className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                            isPresent ? "bg-emerald-50/40" : "hover:bg-slate-50"
                          }`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isPresent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {s.full_name?.[0] ?? s.email?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{s.full_name ?? "—"}</div>
                            <div className="text-xs text-slate-400 truncate">{s.email}</div>
                          </div>
                          {isPresent && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <button
                            disabled={markAttendance.isPending}
                            onClick={() => handleToggle(s.id, !isPresent)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                              isPresent
                                ? "bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-600 border border-emerald-200 hover:border-red-200"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200"
                            }`}>
                            {isPresent ? "Present ✓" : "Mark Present"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
