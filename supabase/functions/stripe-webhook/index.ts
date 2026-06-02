import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const stripe    = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }

    if (event.type === "customer.subscription.deleted" ||
        event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(sub);
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      await handleChargeRefunded(charge);
    }

    if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
      const dispute = event.data.object as Stripe.Dispute;
      await handleChargeDispute(event.type, dispute);
    }

    if (event.type === "charge.refund.updated") {
      const refund = event.data.object as Stripe.Refund;
      if (refund.status === "succeeded" && typeof refund.charge === "string") {
        const ch = await stripe.charges.retrieve(refund.charge);
        await handleChargeRefunded(ch);
      }
    }
  } catch (err) {
    console.error("Error handling webhook event:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const courseId      = session.metadata?.courseId ?? "";
  const customerEmail = session.customer_email ?? session.metadata?.customerEmail ?? "";
  const mode          = session.mode; // "payment" | "subscription"

  if (!courseId) {
    console.warn("No courseId in session metadata, skipping enrollment:", session.id);
    return;
  }

  // Prefer userId from metadata (reliable); fall back to case-insensitive email lookup
  let userId: string | null = session.metadata?.userId ?? null;
  if (!userId) {
    const { data: profile } = await supabase
      .from("ssra_profiles")
      .select("id")
      .ilike("email", customerEmail)
      .maybeSingle();
    userId = profile?.id ?? null;
  }

  if (!userId) {
    console.warn(`Could not resolve user for email ${customerEmail}, enrollment will have null user_id`);
  }

  if (mode === "payment") {
    // One-time course purchase → upsert enrollment (idempotent for webhook retries)
    const { error } = await supabase.from("ssra_enrollments").upsert({
      user_id:    userId,
      course_id:  courseId,
      status:     "active",
      amount_eur: (session.amount_total ?? 0) / 100,
      stripe_session_id:     session.id,
      stripe_payment_intent: session.payment_intent as string ?? null,
      enrolled_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_id" });
    if (error) throw new Error(`Enrollment upsert failed: ${error.message}`);
    console.log(`Enrollment upserted for ${customerEmail} → ${courseId}`);

  } else if (mode === "subscription") {
    // Subscription → find or create Stripe subscription record
    const stripeSubId = session.subscription as string | null;
    let periodEnd: string | null = null;

    if (stripeSubId) {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
    }

    const { error } = await supabase.from("ssra_subscriptions").upsert({
      user_id:              userId,
      course_id:            courseId,
      status:               "active",
      stripe_subscription_id: stripeSubId,
      stripe_customer_id:   session.customer as string ?? null,
      current_period_end:   periodEnd,
      created_at:           new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });

    if (error) throw new Error(`Subscription upsert failed: ${error.message}`);
    console.log(`Subscription created for ${customerEmail} → ${courseId}`);
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const stripeSubId = sub.id;
  const status = sub.status; // active, trialing, past_due, canceled, etc.
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  const { error } = await supabase
    .from("ssra_subscriptions")
    .update({
      status,
      current_period_end: periodEnd,
    })
    .eq("stripe_subscription_id", stripeSubId);

  if (error) console.error("Subscription status update failed:", error.message);
  else console.log(`Subscription ${stripeSubId} updated to ${status}`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntent = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;

  const isFullRefund = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
  const newStatus    = isFullRefund ? "refunded" : "partially_refunded";

  // 1) One-time enrollments — revoke by payment_intent
  if (paymentIntent) {
    const { error, data } = await supabase
      .from("ssra_enrollments")
      .update({ status: newStatus })
      .eq("stripe_payment_intent", paymentIntent)
      .select("id, user_id, course_id");

    if (error) {
      console.error(`Refund update failed for PI ${paymentIntent}:`, error.message);
    } else if (data?.length) {
      console.log(`Refund (${newStatus}) → ${data.length} enrollment(s):`,
        data.map((r) => `${r.user_id}/${r.course_id}`).join(", "));
    }
  }

  // 2) Subscriptions — if this charge belongs to a subscription invoice, revoke it
  const invoiceId = typeof charge.invoice === "string" ? charge.invoice : charge.invoice?.id ?? null;
  if (invoiceId) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const subId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id ?? null;
      if (subId) {
        const subStatus = isFullRefund ? "refunded" : "partially_refunded";
        const { error, data } = await supabase
          .from("ssra_subscriptions")
          .update({ status: subStatus, cancel_at_period_end: true })
          .eq("stripe_subscription_id", subId)
          .select("user_id, course_id");
        if (error) console.error(`Sub refund update failed for ${subId}:`, error.message);
        else if (data?.length) {
          console.log(`Refund (${subStatus}) → subscription ${subId}:`,
            data.map((r) => `${r.user_id}/${r.course_id}`).join(", "));
        }
      }
    } catch (e) {
      console.error(`Failed to resolve invoice ${invoiceId} for refund:`, e);
    }
  }
}

/**
 * Chargeback / dispute handling:
 *  - dispute.created → suspend access immediately (status="disputed")
 *  - dispute.closed  → if won, restore; if lost, mark as "charged_back" (kept revoked)
 */
async function handleChargeDispute(eventType: string, dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
  if (!chargeId) {
    console.warn(`${eventType}: no charge id on dispute ${dispute.id}`);
    return;
  }

  // Resolve payment_intent + subscription via charge → invoice
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["invoice"] });
  const paymentIntent = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  const invoice = charge.invoice as Stripe.Invoice | null;
  const subId = invoice && typeof invoice.subscription === "string"
    ? invoice.subscription
    : (invoice?.subscription as Stripe.Subscription | null)?.id ?? null;

  let newStatus: string;
  if (eventType === "charge.dispute.created") {
    newStatus = "disputed";
  } else {
    // dispute.closed: status is "won", "lost", or "warning_closed"
    if (dispute.status === "won") newStatus = "active";       // restore
    else if (dispute.status === "lost") newStatus = "charged_back";
    else return; // ignore warning_closed etc.
  }

  // Update enrollment(s)
  if (paymentIntent) {
    const { data, error } = await supabase
      .from("ssra_enrollments")
      .update({ status: newStatus })
      .eq("stripe_payment_intent", paymentIntent)
      .select("user_id, course_id");
    if (error) console.error(`Dispute(${dispute.status}) enrollment update failed:`, error.message);
    else if (data?.length) {
      console.log(`Dispute(${eventType}/${dispute.status}) → enrollment status=${newStatus} for`,
        data.map((r) => `${r.user_id}/${r.course_id}`).join(", "));
    }
  }

  // Update subscription
  if (subId) {
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus !== "active") patch.cancel_at_period_end = true;
    const { data, error } = await supabase
      .from("ssra_subscriptions")
      .update(patch)
      .eq("stripe_subscription_id", subId)
      .select("user_id, course_id");
    if (error) console.error(`Dispute(${dispute.status}) sub update failed:`, error.message);
    else if (data?.length) {
      console.log(`Dispute(${eventType}/${dispute.status}) → subscription status=${newStatus} for`,
        data.map((r) => `${r.user_id}/${r.course_id}`).join(", "));
    }
  }
}
