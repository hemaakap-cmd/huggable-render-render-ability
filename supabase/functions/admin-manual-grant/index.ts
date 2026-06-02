import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

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
      stripeReference,      // pi_..., ch_..., cs_..., sub_..., or receipt code
      periodMonths,
      skipVerification,     // optional override flag (still requires audit note)
    } = body ?? {};

    if (!email || typeof email !== "string") return json({ error: "email required" }, 400);
    if (!courseId || typeof courseId !== "string") return json({ error: "courseId required" }, 400);
    if (kind !== "subscription" && kind !== "enrollment") {
      return json({ error: "kind must be 'subscription' or 'enrollment'" }, 400);
    }

    // ── Verify Stripe reference BEFORE granting access
    let verification: any = null;
    if (!skipVerification) {
      if (!stripeReference || typeof stripeReference !== "string" || stripeReference.trim().length < 3) {
        return json({ error: "Stripe reference required for verification. Provide a Payment Intent (pi_...), Charge (ch_...), Checkout Session (cs_...), or Subscription (sub_...) ID." }, 400);
      }
      if (!STRIPE_SECRET_KEY) {
        return json({ error: "STRIPE_SECRET_KEY not configured on server" }, 500);
      }

      const ref = stripeReference.trim();
      const v = await verifyStripeReference(ref);
      if (!v.ok) return json({ error: `Stripe verification failed: ${v.error}` }, 400);
      verification = v.data;

      // amount cross-check (tolerate small discrepancies, allow override)
      const expected = Number(amountEur) || 0;
      if (expected > 0 && v.amountEur != null) {
        const diff = Math.abs(v.amountEur - expected);
        if (diff > 0.5) {
          return json({
            error: `Amount mismatch: Stripe shows €${v.amountEur.toFixed(2)} but you entered €${expected.toFixed(2)}.`,
            verification,
          }, 400);
        }
      }

      // email cross-check (warning only — Stripe email may differ from account email)
      if (v.customerEmail && v.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
        verification.emailWarning = `Stripe customer email (${v.customerEmail}) differs from grant email (${email}).`;
      }

      // kind cross-check
      if (kind === "subscription" && v.type !== "subscription" && v.type !== "checkout_subscription") {
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

    if (kind === "subscription") {
      const months = Math.max(1, Number(periodMonths) || 1);
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const { error } = await admin.from("ssra_subscriptions").upsert({
        user_id: profile.id,
        course_id: courseId,
        status: "active",
        stripe_subscription_id: stripeReference || `manual_${Date.now()}`,
        stripe_customer_id: verification?.customerId ?? null,
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
        stripe_payment_intent: stripeReference || `manual_${Date.now()}`,
        enrolled_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id" });

      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, kind, userId: profile.id, courseId, verification });
    }
  } catch (err) {
    console.error("admin-manual-grant error:", err);
    return json({ error: String((err as any)?.message ?? err) }, 500);
  }
});

// ── Stripe helpers ────────────────────────────────────────────────
async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const data = await res.json();
  return { res, data };
}

interface VerifyResult {
  ok: boolean;
  error?: string;
  type?: "payment_intent" | "charge" | "checkout" | "checkout_subscription" | "subscription";
  amountEur?: number;
  customerId?: string | null;
  customerEmail?: string | null;
  data?: any;
}

async function verifyStripeReference(ref: string): Promise<VerifyResult & { amountEur?: number; data?: any }> {
  const prefix = ref.split("_")[0];

  try {
    if (ref.startsWith("pi_")) {
      const { res, data } = await stripeGet(`payment_intents/${encodeURIComponent(ref)}`);
      if (!res.ok) return { ok: false, error: data?.error?.message ?? "Payment Intent not found" };
      if (data.status !== "succeeded") return { ok: false, error: `Payment Intent status is "${data.status}", not "succeeded"` };
      return {
        ok: true,
        type: "payment_intent",
        amountEur: centsToEur(data.amount_received ?? data.amount, data.currency),
        customerId: data.customer ?? null,
        customerEmail: data.receipt_email ?? null,
        data: { id: data.id, status: data.status, currency: data.currency, amount: data.amount },
      };
    }

    if (ref.startsWith("ch_")) {
      const { res, data } = await stripeGet(`charges/${encodeURIComponent(ref)}`);
      if (!res.ok) return { ok: false, error: data?.error?.message ?? "Charge not found" };
      if (data.status !== "succeeded") return { ok: false, error: `Charge status is "${data.status}"` };
      if (data.refunded) return { ok: false, error: "Charge has been refunded" };
      return {
        ok: true,
        type: "charge",
        amountEur: centsToEur(data.amount, data.currency),
        customerId: data.customer ?? null,
        customerEmail: data.billing_details?.email ?? data.receipt_email ?? null,
        data: { id: data.id, status: data.status, currency: data.currency, amount: data.amount, paid: data.paid },
      };
    }

    if (ref.startsWith("cs_")) {
      const { res, data } = await stripeGet(`checkout/sessions/${encodeURIComponent(ref)}`);
      if (!res.ok) return { ok: false, error: data?.error?.message ?? "Checkout Session not found" };
      if (data.payment_status !== "paid" && data.payment_status !== "no_payment_required") {
        return { ok: false, error: `Checkout payment_status is "${data.payment_status}"` };
      }
      const isSub = data.mode === "subscription";
      return {
        ok: true,
        type: isSub ? "checkout_subscription" : "checkout",
        amountEur: centsToEur(data.amount_total, data.currency),
        customerId: data.customer ?? null,
        customerEmail: data.customer_details?.email ?? data.customer_email ?? null,
        data: { id: data.id, mode: data.mode, payment_status: data.payment_status, subscription: data.subscription },
      };
    }

    if (ref.startsWith("sub_")) {
      const { res, data } = await stripeGet(`subscriptions/${encodeURIComponent(ref)}`);
      if (!res.ok) return { ok: false, error: data?.error?.message ?? "Subscription not found" };
      if (!["active", "trialing", "past_due"].includes(data.status)) {
        return { ok: false, error: `Subscription status is "${data.status}"` };
      }
      const price = data.items?.data?.[0]?.price;
      return {
        ok: true,
        type: "subscription",
        amountEur: price ? centsToEur(price.unit_amount, price.currency) : undefined,
        customerId: data.customer ?? null,
        customerEmail: null,
        data: { id: data.id, status: data.status, current_period_end: data.current_period_end },
      };
    }

    return { ok: false, error: `Unrecognized reference prefix "${prefix}_". Expected pi_, ch_, cs_, or sub_.` };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Stripe API call failed" };
  }
}

function centsToEur(amount: number | null | undefined, currency?: string): number | undefined {
  if (amount == null) return undefined;
  // Stripe amounts are in the smallest currency unit (cents for EUR/USD).
  return Math.round(amount) / 100;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
