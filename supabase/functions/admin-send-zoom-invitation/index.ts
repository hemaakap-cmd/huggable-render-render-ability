/**
 * admin-send-zoom-invitation
 *
 * Admin-only broadcast: send a Zoom meeting invitation to all registered
 * students (auth users with role='student'). Each recipient is logged in
 * `ssra_zoom_broadcast_recipients`, totals on the parent broadcast row.
 *
 * Body: { title, description?, scheduledAt (ISO), durationMinutes,
 *         zoomLink, zoomPassword? }
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
      title,
      description,
      scheduledAt,
      durationMinutes,
      zoomLink,
      zoomPassword,
    } = body as Record<string, string | number | undefined>;

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

    // 1. Create broadcast row
    const { data: broadcast, error: bErr } = await adminClient
      .from("ssra_zoom_broadcasts")
      .insert({
        title: String(title),
        description: description ? String(description) : null,
        scheduled_at: scheduledIso.toISOString(),
        duration_minutes: duration,
        zoom_link: String(zoomLink),
        zoom_password: zoomPassword ? String(zoomPassword) : null,
        audience: "all_students",
        status: "sending",
        sent_by: user.id,
      })
      .select("id")
      .single();
    if (bErr || !broadcast) {
      console.error("broadcast insert failed:", bErr?.message);
      return json({ error: "Could not create broadcast" }, 500);
    }

    // 2. Fetch all student recipients
    const { data: students, error: sErr } = await adminClient
      .from("ssra_profiles")
      .select("id, email, full_name")
      .eq("role", "student")
      .not("email", "is", null);
    if (sErr) {
      console.error("students fetch failed:", sErr.message);
      return json({ error: "Could not load recipients" }, 500);
    }

    const recipients = (students ?? []).filter((s) => s.email && s.email.includes("@"));

    // 3. Insert recipient rows (chunked)
    const rows = recipients.map((s) => ({
      broadcast_id: broadcast.id,
      user_id: s.id,
      email: s.email!.toLowerCase().trim(),
      status: "pending" as const,
    }));
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i += 500) {
        await adminClient.from("ssra_zoom_broadcast_recipients").insert(rows.slice(i, i + 500));
      }
    }
    await adminClient
      .from("ssra_zoom_broadcasts")
      .update({ total_recipients: rows.length })
      .eq("id", broadcast.id);

    // 4. Enqueue an email per recipient
    const scheduledLabel = scheduledIso.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }) + " (Cairo)";

    let sent = 0;
    let failed = 0;
    const failures: { email: string; error: string }[] = [];

    for (const r of recipients) {
      const payload = {
        to: r.email,
        template: "zoom-invitation",
        idempotency_key: `zoom-broadcast-${broadcast.id}-${r.id}`,
        purpose: "transactional",
        data: {
          studentName: r.full_name || "there",
          title: String(title),
          description: description ?? "",
          scheduledAt: scheduledLabel,
          durationMinutes: duration,
          zoomLink: String(zoomLink),
          zoomPassword: zoomPassword ? String(zoomPassword) : "",
        },
      };
      const { error: qErr } = await adminClient.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload,
      });
      if (qErr) {
        failed++;
        failures.push({ email: r.email!, error: qErr.message });
        await adminClient
          .from("ssra_zoom_broadcast_recipients")
          .update({ status: "failed", error: qErr.message })
          .eq("broadcast_id", broadcast.id)
          .eq("email", r.email!.toLowerCase().trim());
      } else {
        sent++;
        await adminClient
          .from("ssra_zoom_broadcast_recipients")
          .update({ status: "queued", sent_at: new Date().toISOString() })
          .eq("broadcast_id", broadcast.id)
          .eq("email", r.email!.toLowerCase().trim());
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

    return json({
      ok: true,
      broadcastId: broadcast.id,
      total: rows.length,
      sent,
      failed,
    });
  } catch (e) {
    console.error("admin-send-zoom-invitation error:", e instanceof Error ? e.message : e);
    return json({ error: "Internal server error" }, 500);
  }
});
