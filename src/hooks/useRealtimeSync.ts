/**
 * useRealtimeSync — the nervous system of the dashboard.
 *
 * Bridges Supabase Realtime → React Query so dashboards reflect domain
 * changes within ~1 second instead of waiting out the 60 s staleTime.
 *
 * Both roles listen to INSERTs on ssra_notifications (the table that ALL
 * domain flows already write to — enrollment, payment, cancellation, refund,
 * homework graded, role change, fraud, waitlist...). This table is live and in
 * the realtime publication; the previous admin channel pointed at a
 * `system_events` table that is NOT provisioned in production, so admin
 * realtime never fired (live audit 2026-06-13, finding H3). Reusing the proven
 * notifications stream gives admins genuine live invalidation with no
 * dependency on unprovisioned infrastructure.
 *
 *  ADMIN  — listens to ALL ssra_notifications INSERTs (RLS lets admins read
 *           every row) and broadly invalidates the admin dashboard query set.
 *  STUDENT — listens to their OWN ssra_notifications rows (user_id = auth.uid()
 *           via RLS) and invalidates the student dashboard query set.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Admin dashboard keys refreshed whenever any domain notification lands. */
const ADMIN_KEYS = [
  "ssra-admin-enrollments", "ssra-admin-stats", "ssra-admin-students-paying",
  "ssra-admin-leads", "ssra-admin-leads-students-stats", "ssra-courses-capacity-map",
  "ssra-stale-enrollments", "ssra-revenue-summary", "ssra-system-health",
  "ssra-admin-sessions", "ssra-sessions-upcoming", "ssra-operational-alerts",
  "ssra-admin-courses", "ssra-admin-subscriptions", "ssra-fraud-flags",
  "ssra-admin-waitlist", "ssra-admin-batches", "ssra-webhook-events",
  "ssra-admin-users", "ssra-reconciliation-live",
];

/** Keys every student-facing notification may affect */
const STUDENT_KEYS = [
  "ssra-enrollments-me", "ssra-subscription-me", "ssra-sessions-mine-upcoming",
  "ssra-sessions-past", "ssra-my-homework", "ssra-my-progress",
  "ssra-enrollment-by-id", "ssra-waitlist-status",
];

export function useRealtimeSync(role: "admin" | "student", userId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (role === "student" && !userId) return;

    const invalidate = (prefixes: string[]) => {
      for (const prefix of prefixes) {
        qc.invalidateQueries({ queryKey: [prefix] });
      }
    };

    const channel = role === "admin"
      ? supabase
          .channel("rt-admin-notifications")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "ssra_notifications" },
            () => invalidate(ADMIN_KEYS),
          )
      : supabase
          .channel(`rt-student-notifications-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "ssra_notifications",
              filter: `user_id=eq.${userId}`,
            },
            () => invalidate(STUDENT_KEYS),
          );

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [role, userId, qc]);
}
