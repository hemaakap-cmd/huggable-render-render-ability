import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Authenticate caller and verify super_admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing token" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from("ssra_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (callerProfile?.role !== "super_admin") {
      return json({ error: "Forbidden — super admin only" }, 403);
    }

    // ── Parse + validate body
    const body = await req.json().catch(() => ({}));
    const {
      email,
      courseId,
      kind,                 // "subscription" | "enrollment"
      amountEur,
      stripeReference,      // payment intent / subscription id / receipt code
      periodMonths,         // for subscriptions
    } = body ?? {};

    if (!email || typeof email !== "string") return json({ error: "email required" }, 400);
    if (!courseId || typeof courseId !== "string") return json({ error: "courseId required" }, 400);
    if (kind !== "subscription" && kind !== "enrollment") {
      return json({ error: "kind must be 'subscription' or 'enrollment'" }, 400);
    }

    // ── Find user
    const { data: profile } = await admin
      .from("ssra_profiles")
      .select("id, email")
      .ilike("email", email.trim())
      .maybeSingle();

    if (!profile?.id) return json({ error: `No user found with email ${email}` }, 404);

    const amt = Number(amountEur) || 0;

    if (kind === "subscription") {
      const months = Math.max(1, Number(periodMonths) || 1);
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const { error } = await admin.from("ssra_subscriptions").upsert({
        user_id: profile.id,
        course_id: courseId,
        status: "active",
        stripe_subscription_id: stripeReference || `manual_${Date.now()}`,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      }, { onConflict: "stripe_subscription_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, kind, userId: profile.id, courseId, periodEnd: periodEnd.toISOString() });
    } else {
      const { error } = await admin.from("ssra_enrollments").upsert({
        user_id: profile.id,
        course_id: courseId,
        status: "active",
        amount_eur: amt,
        stripe_payment_intent: stripeReference || `manual_${Date.now()}`,
        enrolled_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, kind, userId: profile.id, courseId });
    }
  } catch (err) {
    console.error("admin-manual-grant error:", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
