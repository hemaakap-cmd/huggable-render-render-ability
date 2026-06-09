/**
 * nightly-reconciliation
 *
 * Triggered by:
 *   1. pg_cron at 02:00 UTC daily
 *   2. Super-admin manual trigger via /ssra-admin/reconciliation
 *
 * Runs reconcile_system() PL/pgSQL function which:
 *   - Auto-fixes safe inconsistencies (enrolled_count drift, expired waitlist, etc.)
 *   - Flags data needing human review
 *   - Persists a full report to ssra_reconciliation_reports
 *   - Notifies super_admins if issues are found
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // ── Auth: service_role or super_admin only ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  // Allow cron (service-role bearer) OR super_admin JWT
  let triggeredBy = "cron";
  const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!isServiceRole) {
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("ssra_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    triggeredBy = user.id;
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* no body — that's fine */
  }

  const reportId = crypto.randomUUID();

  // ── Emit start event ───────────────────────────────────────────────────────
  await supabaseAdmin.from("system_events" as never).insert({
    event_type:  "ReconciliationStarted",
    entity_type: "reconciliation_report",
    entity_id:   reportId,
    payload:     { triggered_by: body.trigger ?? triggeredBy },
  });

  // ── Create a "running" placeholder so the UI can show progress ────────────
  await supabaseAdmin.from("ssra_reconciliation_reports" as never).insert({
    id:           reportId,
    status:       "running",
    triggered_by: String(body.trigger ?? triggeredBy),
  });

  // ── Run reconciliation ────────────────────────────────────────────────────
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "reconcile_system" as never,
      { p_report_id: reportId },
    );

    if (error) {
      await supabaseAdmin
        .from("ssra_reconciliation_reports" as never)
        .update({ status: "failed", error: error.message })
        .eq("id", reportId);

      await supabaseAdmin.from("system_events" as never).insert({
        event_type:  "ReconciliationFailed",
        entity_type: "reconciliation_report",
        entity_id:   reportId,
        payload:     { error: error.message },
      });

      return new Response(
        JSON.stringify({ ok: false, error: error.message, report_id: reportId }),
        {
          status: 500,
          headers: { ...CORS, "Content-Type": "application/json" },
        },
      );
    }

    await supabaseAdmin.from("system_events" as never).insert({
      event_type:  "ReconciliationCompleted",
      entity_type: "reconciliation_report",
      entity_id:   reportId,
      payload:     data as Record<string, unknown>,
    });

    return new Response(
      JSON.stringify({ ok: true, report_id: reportId, summary: data }),
      {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await supabaseAdmin
      .from("ssra_reconciliation_reports" as never)
      .update({ status: "failed", error: message })
      .eq("id", reportId);

    return new Response(
      JSON.stringify({ ok: false, error: message, report_id: reportId }),
      {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  }
});
