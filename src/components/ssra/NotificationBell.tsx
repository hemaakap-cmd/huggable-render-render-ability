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
  action_url: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_COLOR: Record<string, string> = {
  session_reminder:      "bg-blue-50 border-blue-100",
  enrollment_confirmed:  "bg-emerald-50 border-emerald-100",
  waitlist_notified:     "bg-amber-50 border-amber-100",
  certificate_issued:    "bg-purple-50 border-purple-100",
  refund_processed:      "bg-red-50 border-red-100",
};

const TYPE_DOT: Record<string, string> = {
  session_reminder:     "bg-blue-500",
  enrollment_confirmed: "bg-emerald-500",
  waitlist_notified:    "bg-amber-500",
  certificate_issued:   "bg-purple-500",
  refund_processed:     "bg-red-500",
};

function useNotifications() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["ssra-notifications"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_notifications" as never) as any)
        .select("*")
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
      if (id === "all") {
        await (supabase.from("ssra_notifications" as never) as any)
          .update({ read: true })
          .eq("read", false);
      } else {
        await (supabase.from("ssra_notifications" as never) as any)
          .update({ read: true })
          .eq("id", id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-notifications"] }),
  });
}

export default function NotificationBell({ scheme = "dark" }: { scheme?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

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
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? TYPE_COLOR[n.type] ?? "bg-blue-50 border-blue-100" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-slate-200" : TYPE_DOT[n.type] ?? "bg-blue-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold ${n.read ? "text-slate-600" : "text-slate-900"} leading-snug`}>
                        {n.title}
                      </div>
                      {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {n.action_url && (
                          <Link
                            to={n.action_url}
                            onClick={() => { handleMarkNotif(n.id); setOpen(false); }}
                            className="text-[10px] text-[hsl(220,91%,54%)] flex items-center gap-0.5 hover:underline"
                          >
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                        {!n.read && (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
