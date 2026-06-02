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
