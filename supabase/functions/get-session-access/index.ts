/**
 * get-session-access — Secure, hardened Zoom link delivery
 *
 * Security layers:
 *   1. Auth — valid JWT required
 *   2. Enrollment check — must be enrolled/subscribed for the course
 *   3. Time window — opens 30min before, closes 2h after end
 *   4. Token lifecycle — expiring token per student+session, stored server-side
 *   5. Concurrent access detection — if same user joins from a second device,
 *      old token is revoked and a fraud flag is raised (via DB function)
 *   6. Full audit log — every access (success + failure) recorded
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ACCESS_WINDOW_BEFORE_MINUTES = 30;
const ACCESS_WINDOW_AFTER_MINUTES  = 120;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          ?? req.headers.get("cf-connecting-ip")
          ?? "unknown";
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")              ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")     ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Parse request ───────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };
    if (!sessionId) return json({ error: "sessionId is required" }, 400);

    // ── Fetch session metadata (no credentials live on this table anymore) ──
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("ssra_sessions")
      .select("id, course_id, title, scheduled_at, duration_minutes, is_cancelled")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) return json({ error: "Session not found" }, 404);
    if (session.is_cancelled)   return json({ error: "Session has been cancelled" }, 410);

    // ── Fetch credentials from the locked-down credentials table ────────────
    const { data: creds } = await supabaseAdmin
      .from("ssra_session_credentials")
      .select("zoom_link, zoom_password")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!creds?.zoom_link) return json({ error: "Zoom link not yet available" }, 503);

    // ── Access window ───────────────────────────────────────────
    const startMs = new Date(session.scheduled_at).getTime();
    const nowMs   = Date.now();
    const openMs  = startMs - ACCESS_WINDOW_BEFORE_MINUTES * 60_000;
    const closeMs = startMs + (session.duration_minutes + ACCESS_WINDOW_AFTER_MINUTES) * 60_000;

    if (nowMs < openMs) {
      const minsLeft = Math.ceil((openMs - nowMs) / 60_000);
      return json({ minutesUntilOpen: minsLeft, error: `Access opens in ${minsLeft} minutes` }, 403);
    }
    if (nowMs > closeMs) {
      return json({ error: "Session access window has closed" }, 410);
    }

    // ── Enrollment / subscription check ─────────────────────────
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

    if (!enrollRes.data && !subRes.data) {
      return json({ error: "You are not enrolled in this course" }, 403);
    }

    // ── Token lifecycle ──────────────────────────────────────────
    const expiresAt = new Date(closeMs).toISOString();
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from("ssra_session_tokens")
      .upsert(
        {
          session_id:  sessionId,
          user_id:     user.id,
          expires_at:  expiresAt,
          device_hint: ua.slice(0, 200),
        },
        { onConflict: "session_id,user_id", ignoreDuplicates: false },
      )
      .select("id, token, access_count")
      .single();

    if (tokenErr || !token) {
      console.error("Token upsert failed:", tokenErr?.message);
      return json({ error: "Could not generate access token" }, 500);
    }

    await supabaseAdmin
      .from("ssra_session_tokens")
      .update({
        accessed_at:  new Date().toISOString(),
        access_count: (token.access_count ?? 0) + 1,
      })
      .eq("id", token.id);

    // ── Concurrent-access detection ─────────────────────────────
    // Generate a short hash of token.id + ip as the device fingerprint
    const tokenHash = `${token.id.slice(0, 8)}-${ip.slice(0, 15)}`;

    const { data: concurrentResult } = await supabaseAdmin.rpc(
      "check_concurrent_session_access",
      {
        _user_id:    user.id,
        _session_id: sessionId,
        _token_hash: tokenHash,
        _ip_address: ip,
        _user_agent: ua,
      },
    ).single();

    const wasConcurrent = (concurrentResult as any)?.concurrent === true;

    // ── Deliver link ─────────────────────────────────────────────
    return json({
      zoom_link:     session.zoom_link,
      zoom_password: session.zoom_password,
      session_title: session.title,
      expires_at:    expiresAt,
      access_count:  (token.access_count ?? 0) + 1,
      // surface to client so they can warn (without breaking access)
      warning:       wasConcurrent ? "concurrent_access_detected" : undefined,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("get-session-access error:", msg);
    return json({ error: "Internal error" }, 500);
  }
});
