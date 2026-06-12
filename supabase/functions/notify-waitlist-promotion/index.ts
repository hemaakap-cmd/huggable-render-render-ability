/**
 * notify-waitlist-promotion
 *
 * Triggered by pg_cron every 15 minutes (see migration 20260612100000).
 * Also callable manually by super_admin for immediate delivery.
 *
 * Finds ssra_waitlist rows that are:
 *   - status = 'notified'   (just promoted by the DB trigger)
 *   - email_sent = false    (haven't had the seat-open email sent yet)
 *   - notified_at > 24h ago (skip stale entries — the window may have already expired)
 *
 * For each such row, sends the waitlist-seat-open transactional email,
 * then marks email_sent = true.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ssracourses.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Allow cron (service-role bearer) OR super_admin JWT
  const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!isServiceRole) {
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabaseAdmin
      .from("ssra_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  }

  // Fetch pending email notifications — promoted within last 24 h, email not yet sent
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingRows, error: fetchErr } = await (supabaseAdmin as any)
    .from("ssra_waitlist")
    .select(`
      id,
      user_id,
      course_id,
      expires_at,
      notified_at,
      ssra_profiles!user_id(full_name, email),
      ssra_courses!course_id(title)
    `)
    .eq("status", "notified")
    .eq("email_sent", false)
    .gte("notified_at", since24h)
    .order("notified_at", { ascending: true })
    .limit(50);

  if (fetchErr) {
    console.error("notify-waitlist-promotion: fetch error", fetchErr);
    return new Response(JSON.stringify({ ok: false, error: fetchErr.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const rows = (pendingRows ?? []) as any[];
  let sent = 0;
  let failed = 0;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  for (const row of rows) {
    const profile = row.ssra_profiles;
    const course  = row.ssra_courses;
    const email   = profile?.email;
    const name    = profile?.full_name ?? "Student";
    const courseTitle = course?.title ?? "your waitlisted course";
    const expiresInHours = row.expires_at
      ? Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 3_600_000))
      : 48;

    if (!email) {
      console.warn("notify-waitlist-promotion: no email for user", row.user_id);
      failed++;
      continue;
    }

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: "waitlist-seat-open",
          recipientEmail: email,
          idempotencyKey: `waitlist-promotion-${row.id}`,
          templateData: {
            studentName: name,
            courseName: courseTitle,
            expiresAt,
            enrollUrl: `${SITE_URL}/courses/${row.course_id}`,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("send-transactional-email failed for waitlist row", row.id, text);
        failed++;
        continue;
      }

      // Mark as sent
      await (supabaseAdmin as any)
        .from("ssra_waitlist")
        .update({
          email_sent:    true,
          email_sent_at: new Date().toISOString(),
          updated_at:    new Date().toISOString(),
        })
        .eq("id", row.id);

      sent++;
    } catch (e) {
      console.error("notify-waitlist-promotion: unexpected error for row", row.id, e);
      failed++;
    }
  }

  console.log(`notify-waitlist-promotion: sent=${sent} failed=${failed} total=${rows.length}`);

  return new Response(
    JSON.stringify({ ok: true, processed: rows.length, sent, failed }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
