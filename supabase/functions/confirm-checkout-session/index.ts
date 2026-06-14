import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function genOrderNumber(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function inferEnvironment(sessionId: string, environment?: StripeEnv): StripeEnv {
  if (environment === "sandbox" || environment === "live") return environment;
  if (sessionId.startsWith("cs_live_")) return "live";
  if (sessionId.startsWith("cs_test_")) return "sandbox";
  throw new Error("Unable to determine payment environment");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId, environment } = await req.json() as {
      sessionId?: string;
      environment?: StripeEnv;
    };

    if (!sessionId || typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return new Response(JSON.stringify({ error: "Invalid checkout session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = inferEnvironment(sessionId, environment);
    const stripe = createStripeClient(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "subscription"],
    } as any);

    if (session.metadata?.userId !== user.id) {
      return new Response(JSON.stringify({ error: "This payment belongs to another account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseId = session.metadata?.courseId;
    if (!courseId) {
      return new Response(JSON.stringify({ error: "Payment is missing course details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscription: any = typeof session.subscription === "object" ? session.subscription : null;
    const paymentIsComplete = session.status === "complete" && (
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      ["active", "trialing"].includes(subscription?.status)
    );

    if (!paymentIsComplete) {
      return new Response(JSON.stringify({
        status: "pending",
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: course } = await supabase
      .from("ssra_courses")
      .select("title, start_date, start_time, duration, instructor_name")
      .eq("id", courseId)
      .maybeSingle();

    const { data: existing } = await supabase
      .from("ssra_enrollments")
      .select("id, order_number, paid_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    const paymentIntent = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
    const now = new Date().toISOString();
    const enrollmentPayload = {
      user_id: user.id,
      course_id: courseId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent: paymentIntent,
      amount_eur: session.amount_total != null ? session.amount_total / 100 : null,
      status: "active",
      paid_at: existing?.paid_at ?? now,
      enrolled_at: now,
      order_number: existing?.order_number ?? genOrderNumber(session.mode === "subscription" ? "SUB" : "ORD"),
      environment: env,
      course_title_snapshot: course?.title ?? null,
      start_date_snapshot: course?.start_date ?? null,
      start_time_snapshot: course?.start_time ?? null,
      duration_snapshot: course?.duration ?? null,
      instructor_snapshot: course?.instructor_name ?? null,
      student_email_snapshot: user.email ?? null,
    };

    const { data: enrollment, error: enrollmentError } = existing
      ? await supabase.from("ssra_enrollments").update(enrollmentPayload).eq("id", existing.id).select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id").single()
      : await supabase.from("ssra_enrollments").insert(enrollmentPayload).select("id, status, paid_at, amount_eur, order_number, course_title_snapshot, course_id").single();

    if (enrollmentError) throw enrollmentError;

    if (subscription) {
      const item = subscription.items?.data?.[0];
      await supabase.from("ssra_subscriptions").upsert({
        user_id: user.id,
        course_id: courseId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        status: subscription.status,
        price_id: item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id || null,
        current_period_start: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        updated_at: now,
      }, { onConflict: "stripe_subscription_id" });
    }

    return new Response(JSON.stringify({ status: "success", enrollment }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("confirm-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});