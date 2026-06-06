// Super-admin manual grant: register a Paddle/offline payment when the webhook did not fire.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Authenticate caller and verify super_admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing token" }, 401);

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
      paymentReference,     // txn_xxx, sub_xxx, or any offline receipt code
      periodMonths,
      skipVerification,
    } = body ?? {};

    if (!email || typeof email !== "string") return json({ error: "email required" }, 400);
    if (!courseId || typeof courseId !== "string") return json({ error: "courseId required" }, 400);
    if (kind !== "subscription" && kind !== "enrollment") {
      return json({ error: "kind must be 'subscription' or 'enrollment'" }, 400);
    }

    // ── Optionally verify Paddle reference
    let verification: any = null;
    if (!skipVerification) {
      if (!paymentReference || typeof paymentReference !== "string" || paymentReference.trim().length < 3) {
        return json({ error: "Payment reference required. Provide a Paddle transaction ID (txn_...), subscription ID (sub_...), or check 'Skip verification' for offline receipts." }, 400);
      }
      const ref = paymentReference.trim();
      const v = await verifyPaddleReference(ref);
      if (!v.ok) return json({ error: `Paddle verification failed: ${v.error}` }, 400);
      verification = v.data;

      // Amount cross-check
      const expected = Number(amountEur) || 0;
      if (expected > 0 && v.amountEur != null) {
        const diff = Math.abs(v.amountEur - expected);
        if (diff > 0.5) {
          return json({
            error: `Amount mismatch: Paddle shows €${v.amountEur.toFixed(2)} but you entered €${expected.toFixed(2)}.`,
            verification,
          }, 400);
        }
      }

      // Kind cross-check
      if (kind === "subscription" && v.type !== "subscription") {
        return json({ error: `Reference is a ${v.type}, not a subscription.`, verification }, 400);
      }
      if (kind === "enrollment" && v.type === "subscription") {
        return json({ error: `Reference is a subscription, not a one-time payment.`, verification }, 400);
      }
    }

    // ── Find user
    const { data: profile } = await admin
      .from("ssra_profiles")
      .select("id, email")
      .ilike("email", email.trim())
      .maybeSingle();

    if (!profile?.id) return json({ error: `No user found with email ${email}` }, 404);

    const amt = Number(amountEur) || verification?.amountEur || 0;
    const refId = (paymentReference ?? "").trim() || `manual_${Date.now()}`;

    if (kind === "subscription") {
      const months = Math.max(1, Number(periodMonths) || 1);
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const { error } = await admin.from("ssra_subscriptions").upsert({
        user_id: profile.id,
        course_id: courseId,
        status: "active",
        stripe_subscription_id: refId, // column stores Paddle/manual reference
        stripe_customer_id: null,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      }, { onConflict: "stripe_subscription_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, kind, userId: profile.id, courseId, periodEnd: periodEnd.toISOString(), verification });
    } else {
      const { error } = await admin.from("ssra_enrollments").upsert({
        user_id: profile.id,
        course_id: courseId,
        status: "active",
        amount_eur: amt,
        stripe_payment_intent: refId, // column stores Paddle txn / manual reference
        enrolled_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, kind, userId: profile.id, courseId, verification });
    }
  } catch (err) {
    console.error("admin-manual-grant error:", err);
    return json({ error: String((err as any)?.message ?? err) }, 500);
  }
});

// ── Paddle verification ────────────────────────────────────────────

interface VerifyResult {
  ok: boolean;
  error?: string;
  type?: "transaction" | "subscription";
  amountEur?: number;
  data?: any;
}

async function verifyPaddleReference(ref: string): Promise<VerifyResult> {
  // Try both environments — whichever verifies is the real one
  const envs: PaddleEnv[] = ["live", "sandbox"];

  if (ref.startsWith("txn_")) {
    for (const env of envs) {
      try {
        const res = await gatewayFetch(env, `/transactions/${encodeURIComponent(ref)}`);
        if (!res.ok) continue;
        const body = await res.json();
        const txn = body?.data;
        if (!txn) continue;
        if (!["completed", "paid"].includes(txn.status)) {
          return { ok: false, error: `Transaction status is "${txn.status}", not completed` };
        }
        const total = txn.details?.totals?.total;
        const amountEur = total != null ? Number(total) / 100 : undefined;
        return { ok: true, type: "transaction", amountEur, data: { id: txn.id, status: txn.status, env } };
      } catch { continue; }
    }
    return { ok: false, error: "Paddle transaction not found or verification failed" };
  }

  if (ref.startsWith("sub_")) {
    for (const env of envs) {
      try {
        const res = await gatewayFetch(env, `/subscriptions/${encodeURIComponent(ref)}`);
        if (!res.ok) continue;
        const body = await res.json();
        const sub = body?.data;
        if (!sub) continue;
        if (!["active", "trialing", "past_due"].includes(sub.status)) {
          return { ok: false, error: `Subscription status is "${sub.status}"` };
        }
        return { ok: true, type: "subscription", data: { id: sub.id, status: sub.status, env } };
      } catch { continue; }
    }
    return { ok: false, error: "Paddle subscription not found or verification failed" };
  }

  return { ok: false, error: `Unrecognized reference prefix. Expected txn_ (Paddle transaction) or sub_ (Paddle subscription). Use 'Skip verification' for offline receipts.` };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
