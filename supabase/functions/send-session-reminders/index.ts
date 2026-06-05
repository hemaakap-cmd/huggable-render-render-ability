/**
 * send-session-reminders
 * Admin-triggered: finds sessions in the next 24h and 1h, inserts
 * in-app notifications, and optionally sends transactional emails.
 *
 * Called manually from AdminReports or on a schedule via external cron.
 * POST /functions/v1/send-session-reminders  (no body required)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Require admin auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: ue } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (ue || !user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify caller is admin
    const { data: profile } = await supabaseAdmin
      .from("ssra_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "super_admin"].includes(profile?.role ?? "")) {
      return json({ error: "Forbidden" }, 403);
    }

    const now = new Date();
    const in24h  = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h  = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in1h   = new Date(now.getTime() + 60 * 60 * 1000);
    const in2h   = new Date(now.getTime() + 2  * 60 * 60 * 1000);

    // Sessions 24 hours away (window: 24h–25h from now)
    const { data: sessions24h } = await supabaseAdmin
      .from("ssra_sessions")
      .select("id, title, course_id, scheduled_at")
      .eq("is_cancelled", false)
      .gte("scheduled_at", in24h.toISOString())
      .lte("scheduled_at", in25h.toISOString());

    // Sessions 1 hour away (window: 1h–2h from now)
    const { data: sessions1h } = await supabaseAdmin
      .from("ssra_sessions")
      .select("id, title, course_id, scheduled_at")
      .eq("is_cancelled", false)
      .gte("scheduled_at", in1h.toISOString())
      .lte("scheduled_at", in2h.toISOString());

    let total24h = 0;
    let total1h  = 0;

    for (const session of sessions24h ?? []) {
      const { data: count } = await supabaseAdmin.rpc("notify_session_reminder", {
        _session_id:   session.id,
        _hours_before: 24,
      });
      total24h += count ?? 0;

      // Email reminder — fire-and-forget
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "session-reminder-24h",
          recipientEmail: null,
          batchCourseId: session.course_id,
          batchSessionId: session.id,
          idempotencyKey: `session-24h-${session.id}`,
          templateData: {
            sessionTitle: session.title,
            scheduledAt: session.scheduled_at,
          },
        },
      }).catch((e: unknown) => console.warn("email 24h failed:", e));
    }

    for (const session of sessions1h ?? []) {
      const { data: count } = await supabaseAdmin.rpc("notify_session_reminder", {
        _session_id:   session.id,
        _hours_before: 1,
      });
      total1h += count ?? 0;
    }

    return json({
      ok: true,
      sessions24hCount: (sessions24h ?? []).length,
      sessions1hCount:  (sessions1h ?? []).length,
      notifications24h: total24h,
      notifications1h:  total1h,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-session-reminders error:", msg);
    return json({ error: msg }, 500);
  }
});
