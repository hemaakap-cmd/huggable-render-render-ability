import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ssra_visitor_session";
const HEARTBEAT_MS = 45_000;

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useVisitorTracker() {
  const location = useLocation();
  const lastPathRef = useRef<string>("");

  useEffect(() => {
    // Skip admin/dashboard so admins don't pollute their own stats
    if (/^\/(ssra-admin|dashboard)/.test(location.pathname)) return;

    const session_id = getSessionId();
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.functions.invoke("track-visit", {
          body: {
            session_id,
            path: location.pathname,
            referrer: document.referrer || null,
            user_id: user?.id ?? null,
            utm: {
              source: sessionStorage.getItem("utm_source"),
              medium: sessionStorage.getItem("utm_medium"),
              campaign: sessionStorage.getItem("utm_campaign"),
            },
          },
        });
      } catch { /* silent */ }
    };

    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      ping();
    }
    const t = setInterval(ping, HEARTBEAT_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [location.pathname]);
}
