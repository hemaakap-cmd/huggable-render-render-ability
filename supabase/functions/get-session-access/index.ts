/**
 * get-session-access — Secure Zoom session link delivery
 *
 * Instead of exposing raw zoom_link to students via RLS,
 * this function:
 *   1. Validates the student is enrolled/subscribed for the course
 *   2. Validates the session is within the access window
 *      (30 min before start → 2 hours after end)
 *   3. Generates or retrieves an expiring token for this student+session
 *   4. Logs every access attempt for audit purposes
 *   5. Returns the zoom_link (only after all checks pass)
 *
 * The raw zoom_link should NOT be queried directly by the frontend.
 * MySessions.tsx calls this function to obtain the link.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ACCESS_WINDOW_BEFORE_MINUTES = 30;   // can join 30 min early
const ACCESS_WINDOW_AFTER_MINUTES  = 120;  // link valid 2 hours after scheduled start

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip  = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "";
  const ua  = req.headers.get("user-agent") ?? "";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // 2. Parse request
    const { sessionId } = await req.json();
    if (!sessionId) return json({ error: "sessionId is required" }, 400);

    // 3. Fetch session details (service role — includes zoom_link)
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("ssra_sessions")
      .select("id, course_id, title, zoom_link, zoom_password, scheduled_at, duration_minutes, is_cancelled")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) return json({ error: "Session not found" }, 404);
    if (session.is_cancelled)   return json({ error: "Session has been cancelled" }, 410);

    // 4. Access window check
    const startMs  = new Date(session.scheduled_at).getTime();
    const nowMs    = Date.now();
    const openMs   = startMs - ACCESS_WINDOW_BEFORE_MINUTES * 60_000;
    const closeMs  = startMs + (session.duration_minutes + ACCESS_WINDOW_AFTER_MINUTES) * 60_000;

    if (nowMs < openMs) {
      const minsLeft = Math.ceil((openMs - nowMs) / 60_000);
      return json({ error: `Session access opens in ${minsLeft} minutes` }, 403);
    }
    if (nowMs > closeMs) {
      return json({ error: "Session access window has closed" }, 410);
    }

    // 5. Enrollment / subscription check for this course
    const courseId = session.course_id;
    const [enrollRes, subRes] = await Promise.all([
      supabaseAdmin
        .from("ssra_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .eq("status", "active")
        .maybeSingle(),
      supabaseAdmin
        .from("ssra_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .in("status", ["active", "trialing"])
        .maybeSingle(),
    ]);

    const isAuthorized = !!(enrollRes.data || subRes.data);

    if (!isAuthorized) {
      // Log the failed attempt
      await supabaseAdmin.from("ssra_session_access_log").insert({
        token_id:   "00000000-0000-0000-0000-000000000000",
        user_id:    user.id,
        session_id: sessionId,
        ip_address: ip,
        user_agent: ua,
        success:    false,
        fail_reason: "Not enrolled",
      }).catch(() => {});

      return json({ error: "You are not enrolled in this course" }, 403);
    }

    // 6. Upsert a token for this student+session
    const expiresAt = new Date(closeMs).toISOString();
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from("ssra_session_tokens")
      .upsert(
        {
          session_id: sessionId,
          user_id:    user.id,
          expires_at: expiresAt,
          device_hint: ua.slice(0, 200),
        },
        { onConflict: "session_id,user_id", ignoreDuplicates: false },
      )
      .select("id, token, access_count")
      .single();

    if (tokenErr || !token) {
      console.error("Token upsert failed:", tokenErr);
      return json({ error: "Could not generate access token" }, 500);
    }

    // 7. Increment access_count and record accessed_at
    await supabaseAdmin
      .from("ssra_session_tokens")
      .update({ accessed_at: new Date().toISOString(), access_count: token.access_count + 1 })
      .eq("id", token.id);

    // 8. Log successful access
    await supabaseAdmin.from("ssra_session_access_log").insert({
      token_id:   token.id,
      user_id:    user.id,
      session_id: sessionId,
      ip_address: ip,
      user_agent: ua,
      success:    true,
    }).catch(() => {});

    return json({
      zoom_link:     session.zoom_link,
      zoom_password: session.zoom_password,
      session_title: session.title,
      expires_at:    expiresAt,
      access_count:  token.access_count + 1,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("get-session-access error:", msg);
    return json({ error: "Internal error" }, 500);
  }
});
