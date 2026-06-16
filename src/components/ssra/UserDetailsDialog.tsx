import { useEffect, useState } from "react";
import { X, FileText, ListOrdered, Loader2, Mail, ExternalLink, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Verification = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  degree: string | null;
  graduation_year: string | null;
  german_level: string | null;
  motivation: string | null;
  course_id: string | null;
  diploma_url: string | null;
  status: string | null;
  created_at: string;
};

type WaitlistRow = {
  id: string;
  course_id: string;
  position: number | null;
  status: string | null;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export default function UserDetailsDialog({
  userId,
  userEmail,
  userName,
  onClose,
}: {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [vRes, wRes, bRes] = await Promise.all([
        supabase
          .from("ssra_verifications")
          .select("id, full_name, email, country, degree, graduation_year, german_level, motivation, course_id, diploma_url, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("ssra_waitlist")
          .select("id, course_id, position, status, notified_at, expires_at, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_student_broadcast_history" as never, { _user_id: userId } as never),
      ]);

      // Fallback by email for anonymous applications
      let vRows = (vRes.data as Verification[] | null) ?? [];
      if (vRows.length === 0 && userEmail) {
        const byEmail = await supabase
          .from("ssra_verifications")
          .select("id, full_name, email, country, degree, graduation_year, german_level, motivation, course_id, diploma_url, status, created_at")
          .ilike("email", userEmail)
          .order("created_at", { ascending: false });
        vRows = (byEmail.data as Verification[] | null) ?? [];
      }

      const wRows = (wRes.data as WaitlistRow[] | null) ?? [];

      const courseIds = Array.from(
        new Set(
          [...vRows.map((v) => v.course_id), ...wRows.map((w) => w.course_id)].filter(
            (x): x is string => !!x,
          ),
        ),
      );
      let titles: Record<string, string> = {};
      if (courseIds.length) {
        const { data: cs } = await supabase
          .from("ssra_courses")
          .select("id, title")
          .in("id", courseIds);
        titles = Object.fromEntries((cs ?? []).map((c: any) => [c.id, c.title]));
      }

      if (!cancelled) {
        setVerifications(vRows);
        setWaitlist(wRows);
        setCourseTitles(titles);
        setBroadcastHistory(((bRes as any)?.data ?? []) as any[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, userEmail]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {userName || userEmail || "User details"}
            </h2>
            {userEmail && (
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" /> {userEmail}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <>
              {/* Motivation letters */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Motivation Letter</h3>
                </div>
                {verifications.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    No application or motivation letter for this user.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {verifications.map((v) => (
                      <div key={v.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">
                              {v.course_id ? courseTitles[v.course_id] || v.course_id : "General"}
                            </span>
                            {v.status && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                v.status === "approved" ? "bg-emerald-100 text-emerald-700"
                                : v.status === "rejected" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                              }`}>{v.status}</span>
                            )}
                          </div>
                          <span className="text-slate-400">
                            {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-3">
                          {v.degree && <div><span className="text-slate-400">Degree:</span> {v.degree}</div>}
                          {v.graduation_year && <div><span className="text-slate-400">Graduation year:</span> {v.graduation_year}</div>}
                          {v.german_level && <div><span className="text-slate-400">German level:</span> {v.german_level}</div>}
                          {v.country && <div><span className="text-slate-400">Country:</span> {v.country}</div>}
                        </div>
                        {v.motivation ? (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                            {v.motivation}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No motivation letter written.</p>
                        )}
                        {v.diploma_url && (
                          <a href={v.diploma_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-2">
                            <ExternalLink className="w-3 h-3" /> Open diploma
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Waitlist */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ListOrdered className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Waitlist</h3>
                </div>
                {waitlist.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    This user is not on any waitlist.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Course</th>
                          <th className="text-center px-3 py-2 font-semibold">Position</th>
                          <th className="text-center px-3 py-2 font-semibold">Status</th>
                          <th className="text-left px-3 py-2 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {waitlist.map((w) => (
                          <tr key={w.id}>
                            <td className="px-3 py-2 text-slate-700">{courseTitles[w.course_id] || w.course_id}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600">#{w.position ?? "—"}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                w.status === "notified" ? "bg-amber-100 text-amber-700"
                                : w.status === "enrolled" ? "bg-emerald-100 text-emerald-700"
                                : w.status === "expired" ? "bg-slate-200 text-slate-600"
                                : "bg-slate-100 text-slate-600"
                              }`}>{w.status}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{new Date(w.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Broadcast history */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Zoom Broadcast History</h3>
                </div>
                {broadcastHistory.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                    No Zoom invitations sent to this user.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold">Session</th>
                          <th className="text-left px-3 py-2 font-semibold">Date</th>
                          <th className="text-center px-2 py-2 font-semibold">Sent</th>
                          <th className="text-center px-2 py-2 font-semibold">Opened</th>
                          <th className="text-center px-2 py-2 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {broadcastHistory.map((b: any) => (
                          <tr key={b.broadcast_id}>
                            <td className="px-3 py-2 text-slate-700 truncate max-w-[180px]">{b.title}</td>
                            <td className="px-3 py-2 text-slate-500">{new Date(b.scheduled_at).toLocaleDateString()}</td>
                            <td className="px-2 py-2 text-center">{b.sent_at ? "✓" : "—"}</td>
                            <td className="px-2 py-2 text-center">{b.email_opened ? "✓" : "—"}</td>
                            <td className="px-2 py-2 text-center">
                              {b.joined_session
                                ? <span className="text-emerald-600 font-semibold">✓</span>
                                : <span className="text-slate-300">absent</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
