/**
 * admin-send-zoom-invitation
 *
 * Admin-only broadcast: send a Zoom meeting invitation to a targeted audience.
 * Audience is resolved server-side via resolve_broadcast_audience() RPC.
 *
 * Body: {
 *   title, description?, scheduledAt (ISO), durationMinutes, zoomLink, zoomPassword?,
 *   audienceType?: 'all_students'|'enrolled_after'|'enrolled_before'|'course'|
 *                  'cohort'|'active_subscribers'|'custom'|'not_previously_invited'|'unattended_previous',
 *   audienceFilters?: { date?, course_id?, batch_id?, emails?, prior_broadcast_id? },
 *   excludePriorRecipients?: boolean
 * }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient  = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: ue } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await adminClient.rpc("is_ssra_admin", { _uid: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const {
      title, description, scheduledAt, durationMinutes,
      zoomLink, zoomPassword,
      audienceType = "all_students",
      audienceFilters = {},
      excludePriorRecipients = false,
    } = body as Record<string, unknown>;

    if (!title || !scheduledAt || !zoomLink) {
      return json({ error: "title, scheduledAt and zoomLink are required" }, 400);
    }
    try {
      const u = new URL(String(zoomLink));
      if (!/^https?:$/.test(u.protocol)) throw new Error();
    } catch {
      return json({ error: "zoomLink must be a valid http(s) URL" }, 400);
    }
    const scheduledIso = new Date(String(scheduledAt));
    if (isNaN(scheduledIso.getTime())) return json({ error: "Invalid scheduledAt" }, 400);
    const duration = Number(durationMinutes) || 60;

    // 1. Resolve audience server-side as the admin user (RLS check happens inside RPC)
    const { data: audience, error: audErr } = await userClient.rpc(
      "resolve_broadcast_audience" as never,
      {
        _audience_type: String(audienceType),
        _filters: audienceFilters,
        _exclude_prior: !!excludePriorRecipients,
      } as never,
    );
    if (audErr) {
      console.error("resolve_broadcast_audience:", audErr.message);
      return json({ error: "Could not resolve audience: " + audErr.message }, 400);
    }
    const recipients = ((audience ?? []) as Array<{ user_id: string; email: string; full_name: string }>)
      .filter((r) => r.email && r.email.includes("@"));

    if (recipients.length === 0) {
      return json({ error: "Audience is empty — refine your targeting filters." }, 400);
    }

    // 2. Create broadcast row
    const { data: broadcast, error: bErr } = await adminClient
      .from("ssra_zoom_broadcasts")
      .insert({
        title: String(title),
        description: description ? String(description) : null,
        scheduled_at: scheduledIso.toISOString(),
        duration_minutes: duration,
        zoom_link: String(zoomLink),
        zoom_password: zoomPassword ? String(zoomPassword) : null,
        audience: String(audienceType),
        audience_type: String(audienceType),
        audience_filters: audienceFilters,
        status: "sending",
        sent_by: user.id,
      } as never)
      .select("id")
      .single();
    if (bErr || !broadcast) {
      console.error("broadcast insert failed:", bErr?.message);
      return json({ error: "Could not create broadcast" }, 500);
    }

    // 3. Insert recipient rows (chunked) — DB generates unsubscribe_token
    const rows = recipients.map((s) => ({
      broadcast_id: broadcast.id,
      user_id: s.user_id,
      email: s.email.toLowerCase().trim(),
      status: "pending" as const,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await adminClient.from("ssra_zoom_broadcast_recipients").insert(rows.slice(i, i + 500));
    }
    await adminClient
      .from("ssra_zoom_broadcasts")
      .update({ total_recipients: rows.length })
      .eq("id", broadcast.id);

    // 4. Pull back recipient ids + tokens to build tracked links per row
    const { data: inserted } = await adminClient
      .from("ssra_zoom_broadcast_recipients")
      .select("id, user_id, email, unsubscribe_token")
      .eq("broadcast_id", broadcast.id);

    const tokenByUser = new Map<string, string>();
    (inserted ?? []).forEach((r: { user_id: string | null; unsubscribe_token: string }) => {
      if (r.user_id) tokenByUser.set(r.user_id, r.unsubscribe_token);
    });

    // 5. Enqueue an email per recipient with tracking pixel + tracked join link
    const scheduledLabel = scheduledIso.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }) + " (Cairo)";

    const fnBase = `${SUPABASE_URL}/functions/v1`;
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      const token = tokenByUser.get(r.user_id) ?? "";
      const trackingPixelUrl = `${fnBase}/track-broadcast-open?t=${encodeURIComponent(token)}`;
      const trackedJoinUrl = `${fnBase}/track-broadcast-join?t=${encodeURIComponent(token)}&r=${encodeURIComponent(String(zoomLink))}`;

      const { error: qErr } = await adminClient.functions.invoke("send-transactional-email", {
        body: {
          templateName: "zoom-invitation",
          recipientEmail: r.email,
          idempotencyKey: `zoom-broadcast-${broadcast.id}-${r.user_id}`,
          templateData: {
            studentName: r.full_name || "there",
            title: String(title),
            description: description ?? "",
            scheduledAt: scheduledLabel,
            durationMinutes: duration,
            zoomLink: trackedJoinUrl,
            zoomPassword: zoomPassword ? String(zoomPassword) : "",
            trackingPixelUrl,
          },
        },
      });
      if (qErr) {
        failed++;
        await adminClient
          .from("ssra_zoom_broadcast_recipients")
          .update({ status: "failed", error: qErr.message })
          .eq("broadcast_id", broadcast.id)
          .eq("email", r.email.toLowerCase().trim());
      } else {
        sent++;
        await adminClient
          .from("ssra_zoom_broadcast_recipients")
          .update({ status: "queued", sent_at: new Date().toISOString() })
          .eq("broadcast_id", broadcast.id)
          .eq("email", r.email.toLowerCase().trim());
      }
    }

    await adminClient
      .from("ssra_zoom_broadcasts")
      .update({
        sent_count: sent,
        failed_count: failed,
        status: failed === 0 ? "sent" : (sent === 0 ? "failed" : "partial"),
      })
      .eq("id", broadcast.id);

    return json({ ok: true, broadcastId: broadcast.id, total: rows.length, sent, failed });
  } catch (e) {
    console.error("admin-send-zoom-invitation error:", e instanceof Error ? e.message : e);
    return json({ error: "Internal server error" }, 500);
  }
});
