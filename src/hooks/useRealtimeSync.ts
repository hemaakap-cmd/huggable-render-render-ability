/**
 * useRealtimeSync — the nervous system of the dashboard.
 *
 * Bridges Supabase Realtime → React Query so dashboards reflect domain
 * changes within ~1 second instead of waiting out the 60 s staleTime.
 *
 * Two channels, chosen by role:
 *
 *  ADMIN  — listens to INSERTs on system_events (the immutable event bus that
 *           every DB trigger and the payments webhook write to). Each
 *           event_type maps to the React Query keys it invalidates. RLS on
 *           system_events restricts the stream to admins, so non-admins
 *           receive nothing even if they subscribe.
 *
 *  STUDENT — listens to INSERTs on their own ssra_notifications rows
 *           (user_id = auth.uid() via RLS). Every student-facing flow
 *           (enrollment activated, session cancelled, certificate issued,
 *           homework graded, waitlist promoted...) already creates a
 *           notification, so it doubles as a perfect change signal.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** event_type → React Query key prefixes to invalidate */
const ADMIN_EVENT_KEY_MAP: Record<string, string[]> = {
  EnrollmentCreated:       ["ssra-admin-enrollments", "ssra-admin-stats", "ssra-admin-students-paying", "ssra-admin-leads", "ssra-admin-leads-students-stats", "ssra-courses-capacity-map", "ssra-stale-enrollments"],
  EnrollmentActivated:     ["ssra-admin-enrollments", "ssra-admin-stats", "ssra-admin-students-paying", "ssra-revenue-summary", "ssra-courses-capacity-map", "ssra-system-health"],
  EnrollmentCancelled:     ["ssra-admin-enrollments", "ssra-admin-stats", "ssra-revenue-summary", "ssra-courses-capacity-map", "ssra-admin-waitlist"],
  RefundCompleted:         ["ssra-admin-enrollments", "ssra-admin-stats", "ssra-revenue-summary"],
  SessionCreated:          ["ssra-admin-sessions", "ssra-sessions-upcoming", "ssra-operational-alerts"],
  SessionCancelled:        ["ssra-admin-sessions", "ssra-sessions-upcoming", "ssra-sessions-mine-upcoming"],
  SessionDeleted:          ["ssra-admin-sessions", "ssra-sessions-upcoming"],
  CourseUpdated:           ["ssra-admin-courses", "ssra-courses-capacity-map", "ssra-price-hidden-map"],
  CertificateIssued:       ["ssra-admin-stats"],
  CertificateRevoked:      ["ssra-admin-stats"],
  SubscriptionPastDue:     ["ssra-admin-subscriptions"],
  SubscriptionCancelled:   ["ssra-admin-subscriptions", "ssra-admin-stats"],
  SubscriptionReactivated: ["ssra-admin-subscriptions"],
  FraudFlagRaised:         ["ssra-fraud-flags", "ssra-system-health"],
  WaitlistPromoted:        ["ssra-admin-waitlist", "ssra-system-health", "ssra-cron-health"],
  BatchStatusChanged:      ["ssra-admin-batches", "ssra-batch-report"],
  ReconciliationCompleted: ["ssra-cron-health", "ssra-system-health"],
  WebhookProcessed:        ["ssra-webhook-events"],
  RoleChanged:             ["ssra-admin-users", "ssra-admin-students-paying"],
};

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
          .channel("rt-admin-system-events")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "system_events" },
            (payload) => {
              const eventType = (payload.new as { event_type?: string })?.event_type;
              if (eventType && ADMIN_EVENT_KEY_MAP[eventType]) {
                invalidate(ADMIN_EVENT_KEY_MAP[eventType]);
              }
            },
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
