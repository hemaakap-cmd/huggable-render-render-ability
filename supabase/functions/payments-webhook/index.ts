import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function genOrderNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const sb = getSupabase();
  if (session.mode !== "payment") return; // subscriptions handled by subscription.* events

  const userId = session.metadata?.userId;
  const courseId = session.metadata?.courseId;
  if (!userId || !courseId) {
    console.error("checkout.session.completed missing metadata", session.id);
    return;
  }

  const orderNumber = genOrderNumber("ORD");
  const amountTotal = session.amount_total ? session.amount_total / 100 : null;

  // Try update existing pending row first
  const { data: existing } = await sb
    .from("ssra_enrollments")
    .select("id, order_number")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (existing) {
    await sb
      .from("ssra_enrollments")
      .update({
        status: "active",
        paid_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        stripe_payment_intent: session.payment_intent,
        amount_eur: amountTotal,
        order_number: existing.order_number ?? orderNumber,
        environment: env,
      })
      .eq("id", existing.id);
  } else {
    await sb.from("ssra_enrollments").upsert({
      user_id: userId,
      course_id: courseId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      amount_eur: amountTotal,
      status: "active",
      paid_at: new Date().toISOString(),
      enrolled_at: new Date().toISOString(),
      order_number: orderNumber,
      environment: env,
    }, { onConflict: "user_id,course_id" });
  }
}

async function handleSubscriptionCreatedOrUpdated(subscription: any, env: StripeEnv, eventType: string) {
  const sb = getSupabase();
  const userId = subscription.metadata?.userId;
  const courseId = subscription.metadata?.courseId;
  if (!userId) {
    console.error("subscription event missing userId metadata", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await sb.from("ssra_subscriptions").upsert({
    user_id: userId,
    course_id: courseId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: subscription.status,
    price_id: priceId,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  // Activate enrollment when subscription is active/trialing
  if (courseId && ["active", "trialing"].includes(subscription.status)) {
    const { data: existing } = await sb
      .from("ssra_enrollments")
      .select("id, order_number, paid_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      await sb.from("ssra_enrollments").update({
        status: "active",
        paid_at: existing.paid_at ?? new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        order_number: existing.order_number ?? genOrderNumber("SUB"),
        environment: env,
      }).eq("id", existing.id);
    } else {
      await sb.from("ssra_enrollments").insert({
        user_id: userId,
        course_id: courseId,
        status: "active",
        paid_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        order_number: genOrderNumber("SUB"),
        environment: env,
      });
    }
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const sb = getSupabase();
  await sb.from("ssra_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  // Per business rule: access lasts until current_period_end. We do not revoke the
  // enrollment here; an external job (or the subscription record itself) gates access.
  const periodEnd = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
  if (periodEnd && periodEnd * 1000 < Date.now()) {
    const userId = subscription.metadata?.userId;
    const courseId = subscription.metadata?.courseId;
    if (userId && courseId) {
      await sb.from("ssra_enrollments")
        .update({ status: "cancelled" })
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("environment", env);
    }
  }
}

async function handleChargeRefunded(charge: any, env: StripeEnv) {
  const sb = getSupabase();
  const paymentIntent = charge.payment_intent;
  if (!paymentIntent) return;
  await sb.from("ssra_enrollments")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent", paymentIntent)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log("Stripe event:", event.type, "env:", env);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionCreatedOrUpdated(event.data.object, env, event.type);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object, env);
      break;
    case "invoice.payment_failed":
      // Stripe is retrying; ssra_subscriptions.status will go to past_due via subscription.updated
      console.log("Invoice payment failed:", event.data.object?.id);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
