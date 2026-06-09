import { useState, useEffect, useRef } from "react";
import { Bell, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSsraAuth } from "@/hooks/useSsraAuth";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// Notification type styling — keep in sync with the `type` strings written by
// server-side triggers and edge functions (see ssra_notifications inserts).
const TYPE_COLOR: Record<string, string> = {
  payment:                    "bg-emerald-50 border-emerald-100",
  enrollment:                 "bg-emerald-50 border-emerald-100",
  cancellation:               "bg-red-50 border-red-100",
  subscription:               "bg-blue-50 border-blue-100",
  subscription_past_due:      "bg-red-50 border-red-100",
  subscription_cancelled:     "bg-red-50 border-red-100",
  instructor_assigned:        "bg-blue-50 border-blue-100",
  instructor_unassigned:      "bg-amber-50 border-amber-100",
  session_link:               "bg-blue-50 border-blue-100",
  session_reminder:           "bg-blue-50 border-blue-100",
  session_cancelled:          "bg-red-50 border-red-100",
  homework_submitted:         "bg-violet-50 border-violet-100",
  homework_graded:            "bg-violet-50 border-violet-100",
  certificate_issued:         "bg-purple-50 border-purple-100",
  certificate_revoked:        "bg-red-50 border-red-100",
  waitlist_promoted:          "bg-amber-50 border-amber-100",
  refund_processed:           "bg-red-50 border-red-100",
  fraud_flag:                 "bg-rose-50 border-rose-100",
  material_uploaded:          "bg-teal-50 border-teal-100",
  reconciliation_report:      "bg-slate-50 border-slate-100",
};

const TYPE_DOT: Record<string, string> = {
  payment:                    "bg-emerald-500",
  enrollment:                 "bg-emerald-500",
  cancellation:               "bg-red-500",
  subscription:               "bg-blue-500",
  subscription_past_due:      "bg-red-500",
  subscription_cancelled:     "bg-red-500",
  instructor_assigned:        "bg-blue-500",
  instructor_unassigned:      "bg-amber-500",
  session_link:               "bg-blue-500",
  session_reminder:           "bg-blue-500",
  session_cancelled:          "bg-red-500",
  homework_submitted:         "bg-violet-500",
  homework_graded:            "bg-violet-500",
  certificate_issued:         "bg-purple-500",
  certificate_revoked:        "bg-red-500",
  waitlist_promoted:          "bg-amber-500",
  refund_processed:           "bg-red-500",
  fraud_flag:                 "bg-rose-500",
  material_uploaded:          "bg-teal-500",
  reconciliation_report:      "bg-slate-400",
};

function useNotifications() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["ssra-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_notifications" as never) as any)
        .select("id, type, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | "all") => {
      const now = new Date().toISOString();
      if (id === "all") {
        await (supabase.from("ssra_notifications" as never) as any)
          .update({ read_at: now })
          .is("read_at", null);
      } else {
        await (supabase.from("ssra_notifications" as never) as any)
          .update({ read_at: now })
          .eq("id", id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-notifications"] }),
  });
}

export default function NotificationBell({ scheme = "dark" }: { scheme?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useSsraAuth();
  const qc = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Live updates — re-query when the server inserts/updates a notification for me.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`ssra-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ssra_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["ssra-notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkNotif = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          scheme === "light"
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        }`}
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="font-semibold text-slate-900 text-sm">Notifications</div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead.mutate("all")}
                  className="text-xs text-[hsl(220,91%,54%)] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors ${isUnread ? TYPE_COLOR[n.type] ?? "bg-blue-50 border-blue-100" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!isUnread ? "bg-slate-200" : TYPE_DOT[n.type] ?? "bg-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${!isUnread ? "text-slate-600" : "text-slate-900"} leading-snug`}>
                          {n.title}
                        </div>
                        {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {n.link && (
                            <Link
                              to={n.link}
                              onClick={() => { handleMarkNotif(n.id); setOpen(false); }}
                              className="text-[10px] text-[hsl(220,91%,54%)] flex items-center gap-0.5 hover:underline"
                            >
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                          {isUnread && (
                            <button
                              onClick={() => handleMarkNotif(n.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 ml-auto"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
