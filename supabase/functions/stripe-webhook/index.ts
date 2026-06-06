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

async function sendTransactionalEmail(templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, unknown>) {
  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    if (error) console.error(`[email:${templateName}] invoke failed:`, error.message);
    else console.log(`[email:${templateName}] queued for ${recipientEmail}`);
  } catch (e) {
    console.error(`[email:${templateName}] threw:`, e);
  }
}

function fmtMoney(amountCents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((amountCents ?? 0) / 100);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}
function fmtTime(t?: string | null) {
  if (!t) return "—";
  return t.length >= 5 ? t.slice(0, 5) : t;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const courseId      = session.metadata?.courseId ?? "";
  const customerEmail = session.customer_email ?? session.metadata?.customerEmail ?? "";
  const mode          = session.mode;

  if (!courseId) {
    console.warn("No courseId in session metadata, skipping enrollment:", session.id);
    return;
  }

  let userId: string | null = session.metadata?.userId ?? null;
  let studentName: string | null = null;
  if (!userId && customerEmail) {
    const { data: profile } = await supabase
      .from("ssra_profiles").select("id, full_name").ilike("email", customerEmail).maybeSingle();
    userId = profile?.id ?? null;
    studentName = profile?.full_name ?? null;
  } else if (userId) {
    const { data: profile } = await supabase
      .from("ssra_profiles").select("full_name").eq("id", userId).maybeSingle();
    studentName = profile?.full_name ?? null;
  }

  // SAFETY: never store an enrollment with NULL user_id.
  // If the buyer paid without an account (e.g., guest checkout / payment link),
  // provision an auth user on the fly so the enrollment is attributable.
  if (!userId && customerEmail) {
    try {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,  // they paid — trust the email
        user_metadata: { source: "stripe_webhook_auto", course_id: courseId },
      });
      if (createErr) {
        // Race: another concurrent webhook may have created them; refetch
        const { data: existing } = await supabase
          .from("ssra_profiles").select("id, full_name").ilike("email", customerEmail).maybeSingle();
        userId = existing?.id ?? null;
        studentName = existing?.full_name ?? null;
      } else if (created?.user) {
        userId = created.user.id;
        console.log(`[webhook] auto-provisioned user ${userId} for ${customerEmail}`);
      }
    } catch (e) {
      console.error("[webhook] auto-provision failed:", e);
    }
  }

  const { data: course } = await supabase
    .from("ssra_courses")
    .select("title, start_date, start_time, duration, instructor_name, course_format, price_eur")
    .eq("id", courseId)
    .maybeSingle();

  const amountCents = session.amount_total ?? 0;
  const paidAtIso   = new Date().toISOString();
  const currency    = (session.currency ?? "eur").toUpperCase();

  if (!userId) {
    console.error(`[webhook] CRITICAL: cannot resolve or provision user for ${customerEmail} on session ${session.id} — refusing to create orphaned enrollment.`);
    // Do NOT create an orphaned row. Stripe will retry the webhook; meanwhile we have
    // a clear log and the payment is recoverable via Stripe dashboard.
    return;
  }

  if (mode === "payment") {
    const { data: enrollment, error } = await supabase.from("ssra_enrollments").upsert({
      user_id:    userId,
      course_id:  courseId,
      status:     "active",
      amount_eur: amountCents / 100,
      stripe_session_id:     session.id,
      stripe_payment_intent: session.payment_intent as string ?? null,
      enrolled_at: paidAtIso,
      paid_at:     paidAtIso,
      course_title_snapshot:  course?.title ?? null,
      start_date_snapshot:    course?.start_date ?? null,
      start_time_snapshot:    course?.start_time ?? null,
      duration_snapshot:      course?.duration ?? null,
      instructor_snapshot:    course?.instructor_name ?? null,
      student_name_snapshot:  studentName,
      student_email_snapshot: customerEmail,
    }, { onConflict: "user_id,course_id" }).select("order_number").maybeSingle();

    if (error) throw new Error(`Enrollment upsert failed: ${error.message}`);
    console.log(`Enrollment upserted for ${customerEmail} → ${courseId} (order=${enrollment?.order_number})`);

    // Record coupon use to prevent reuse and keep uses_count accurate
    const couponId = session.metadata?.couponId;
    if (couponId && userId) {
      const discountEur = session.total_details?.amount_discount
        ? session.total_details.amount_discount / 100
        : null;
      // IGNORE duplicate — onConflict(coupon_id,user_id) is handled by DB unique constraint
      const { error: couponUseErr } = await supabase.from("ssra_coupon_uses").insert({
        coupon_id:    couponId,
        user_id:      userId,
        discount_eur: discountEur,
        used_at:      paidAtIso,
      });
      if (couponUseErr && couponUseErr.code !== "23505") {
        console.error("[webhook] coupon_use insert failed:", couponUseErr.message);
      } else {
        await supabase.rpc("increment_coupon_uses", { _coupon_id: couponId });
      }
    }

    if (customerEmail) {
      const emailData = {
        studentName: studentName ?? "",
        courseName: course?.title ?? "",
        startDate: fmtDate(course?.start_date),
        startTime: fmtTime(course?.start_time),
        duration: course?.duration ?? "",
        instructor: course?.instructor_name ?? "",
        courseFormat: course?.course_format ?? "",
        orderNumber: enrollment?.order_number ?? session.id,
        amountPaid: fmtMoney(amountCents, currency),
        paymentDate: fmtDate(paidAtIso),
      };
      await sendTransactionalEmail("payment-confirmation", customerEmail, `pay-${session.id}`, emailData);
      await sendTransactionalEmail("enrollment-confirmation", customerEmail, `enr-${session.id}`, emailData);
    }

  } else if (mode === "subscription") {
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
      created_at:           paidAtIso,
    }, { onConflict: "stripe_subscription_id" });

    if (error) throw new Error(`Subscription upsert failed: ${error.message}`);
    console.log(`Subscription created for ${customerEmail} → ${courseId}`);

    if (customerEmail) {
      const emailData = {
        studentName: studentName ?? "",
        courseName: course?.title ?? "",
        startDate: fmtDate(course?.start_date),
        startTime: fmtTime(course?.start_time),
        duration: course?.duration ?? "",
        instructor: course?.instructor_name ?? "",
        courseFormat: course?.course_format ?? "",
        orderNumber: stripeSubId ?? session.id,
        amountPaid: fmtMoney(amountCents, currency) + "/mo",
        paymentDate: fmtDate(paidAtIso),
      };
      await sendTransactionalEmail("payment-confirmation", customerEmail, `pay-sub-${session.id}`, emailData);
      await sendTransactionalEmail("enrollment-confirmation", customerEmail, `enr-sub-${session.id}`, emailData);
    }
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
