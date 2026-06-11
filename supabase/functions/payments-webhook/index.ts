// Paddle webhook — auto-enroll student on payment, send confirmation + admin notice.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { EventName, getPaddleClient, getWebhookSecret, type PaddleEnv } from '../_shared/paddle.ts';
import { handleAdjustmentEvent } from './handlers.ts';

// Verify the signature against BOTH environment secrets and derive env from
// whichever one succeeds. This prevents an attacker from spoofing the
// environment via a caller-controlled query parameter — only Paddle, which
// holds the secrets, can determine which environment a valid event came from.
async function verifyAndDetectEnv(req: Request): Promise<{ event: any; env: PaddleEnv }> {
  const signature = req.headers.get('paddle-signature');
  const body = await req.text();
  if (!signature || !body) throw new Error('Missing signature or body');

  const envs: PaddleEnv[] = ['live', 'sandbox'];
  let lastErr: unknown = null;
  for (const env of envs) {
    try {
      const secret = getWebhookSecret(env);
      const paddle = getPaddleClient(env);
      const event = await paddle.webhooks.unmarshal(body, secret, signature);
      return { event, env };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Webhook signature verification failed: ${(lastErr as Error)?.message ?? 'unknown'}`);
}

const ADMIN_NOTIFY_EMAIL = Deno.env.get('ADMIN_NOTIFY_EMAIL') ?? 'hemaakap@gmail.com';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://ssracourses.com';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _supabase;
}

async function sendEmail(
  templateName: string,
  recipientEmail: string,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    });
    if (!res.ok) console.error('send email failed', templateName, await res.text());
  } catch (e) {
    console.error('sendEmail error', e);
  }
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const custom = data.customData ?? {};
  const enrollmentId = custom.enrollmentId as string | undefined;
  const userId = custom.userId as string | undefined;
  const courseId = custom.courseId as string | undefined;

  if (!enrollmentId || !userId || !courseId) {
    console.warn('transaction.completed missing customData', { enrollmentId, userId, courseId });
    return;
  }

  const supabase = getSupabase();

  // Activate enrollment — scoped to BOTH the enrollment id AND the paying
  // user's id to prevent customData-injection attacks where a malicious
  // payer puts a victim's enrollment UUID into customData. The eq on
  // user_id makes the update a no-op when ownership doesn't match.
  const { data: enrollment, error: updateErr } = await supabase
    .from('ssra_enrollments')
    .update({
      status: 'active',
      paid_at: new Date().toISOString(),
      enrolled_at: new Date().toISOString(),
      stripe_payment_intent: data.id, // reuse column for Paddle transaction id
    })
    .eq('id', enrollmentId)
    .eq('user_id', userId)
    .select('id, user_id, order_number, amount_eur, course_title_snapshot, student_name_snapshot, student_email_snapshot, start_date_snapshot, start_time_snapshot, duration_snapshot, instructor_snapshot, coupon_code')
    .maybeSingle();

  if (updateErr || !enrollment) {
    console.error('enrollment update failed or ownership mismatch', updateErr, { enrollmentId, userId });
    return;
  }

  // Consume coupon if one was applied (best-effort — must not block enrollment activation)
  const couponCode = (enrollment as any).coupon_code as string | null;
  if (couponCode) {
    try {
      const { data: couponRows } = await supabase
        .from('ssra_coupons')
        .select('id')
        .eq('code', couponCode)
        .maybeSingle();
      if (couponRows?.id) {
        await Promise.all([
          supabase.rpc('increment_coupon_uses', { _coupon_id: couponRows.id }),
          supabase.from('ssra_coupon_uses').insert({
            coupon_id: couponRows.id,
            user_id: userId,
            enrollment_id: enrollmentId,
          }),
        ]);
      }
    } catch (e) {
      console.error('coupon tracking failed (non-blocking):', e);
    }
  }

  const totalAmount = data.details?.totals?.total
    ? (Number(data.details.totals.total) / 100).toFixed(2)
    : Number(enrollment.amount_eur ?? 0).toFixed(2);
  const currency = data.currencyCode ?? 'EUR';
  const recipient = enrollment.student_email_snapshot as string | null;
  const courseName = (enrollment.course_title_snapshot as string | null) ?? courseId;
  const studentName = (enrollment.student_name_snapshot as string | null) ?? 'Student';
  const orderNumber = (enrollment.order_number as string | null) ?? enrollment.id;

  // 1. Payment receipt to student
  if (recipient) {
    await sendEmail('payment-confirmation', recipient, `paddle-pay-${data.id}`, {
      studentName,
      courseName,
      orderNumber,
      amountPaid: `${currency} ${totalAmount}`,
      paymentDate: new Date().toLocaleDateString('en-GB'),
    });
    // 2. Enrollment confirmation with access details
    await sendEmail('enrollment-confirmation', recipient, `paddle-enr-${data.id}`, {
      studentName,
      courseName,
      orderNumber,
      startDate: enrollment.start_date_snapshot,
      startTime: enrollment.start_time_snapshot,
      duration: enrollment.duration_snapshot,
      instructor: enrollment.instructor_snapshot,
      dashboardUrl: `${SITE_URL}/dashboard`,
    });
  }

  // 3. Notify admin
  await sendEmail('admin-purchase-notification', ADMIN_NOTIFY_EMAIL, `paddle-admin-${data.id}`, {
    studentName,
    studentEmail: recipient,
    courseName,
    orderNumber,
    amountPaid: `${currency} ${totalAmount}`,
    environment: env,
    transactionId: data.id,
  });

  // 4. In-app notification
  await supabase.from('ssra_notifications').insert({
    user_id: userId,
    type: 'enrollment',
    title: `Welcome to ${courseName}`,
    body: `Your payment was received. Order ${orderNumber}.`,
    link: '/dashboard',
  });
}

async function handleSubscriptionCreated(data: any, _env: PaddleEnv) {
  const custom = data.customData ?? {};
  const userId = custom.userId as string | undefined;
  const courseId = custom.courseId as string | undefined;
  const enrollmentId = custom.enrollmentId as string | undefined;
  if (!userId || !courseId) {
    console.warn('subscription.created missing customData', { userId, courseId });
    return;
  }
  const supabase = getSupabase();

  await supabase.from('ssra_subscriptions').upsert({
    user_id: userId,
    course_id: courseId,
    stripe_subscription_id: data.id,
    stripe_customer_id: data.customerId,
    status: data.status ?? 'active',
    current_period_start: data.currentBillingPeriod?.startsAt,
    current_period_end: data.currentBillingPeriod?.endsAt,
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  // Activate the pending enrollment so the student gets course access.
  if (enrollmentId) {
    const { data: enr } = await supabase
      .from('ssra_enrollments')
      .update({
        status: 'active',
        paid_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId)
      .eq('user_id', userId)
      .select('student_email_snapshot, student_name_snapshot, course_title_snapshot, order_number')
      .maybeSingle();

    // Note: enrollment-confirmation + admin-purchase-notification are sent
    // from handleTransactionCompleted to avoid duplicate emails when both
    // transaction.completed and subscription.created fire for the same purchase.

    await supabase.from('ssra_notifications').insert({
      user_id: userId,
      type: 'enrollment',
      title: `Welcome to ${enr?.course_title_snapshot ?? 'your course'}`,
      body: `Your subscription is active. You can cancel anytime from your account.`,
      link: '/dashboard',
    });
  }
}

async function handleSubscriptionUpdated(data: any, _env: PaddleEnv) {
  await getSupabase().from('ssra_subscriptions').update({
    status: data.status,
    current_period_start: data.currentBillingPeriod?.startsAt,
    current_period_end: data.currentBillingPeriod?.endsAt,
    cancel_at_period_end: data.scheduledChange?.action === 'cancel',
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', data.id);
}

async function handleSubscriptionCanceled(data: any, _env: PaddleEnv) {
  const supabase = getSupabase();
  await supabase.from('ssra_subscriptions').update({
    status: 'canceled',
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', data.id);

  // Revoke course access once the subscription truly ends.
  const { data: sub } = await supabase
    .from('ssra_subscriptions')
    .select('user_id, course_id')
    .eq('stripe_subscription_id', data.id)
    .maybeSingle();
  if (sub) {
    await supabase
      .from('ssra_enrollments')
      .update({ status: 'cancelled' })
      .eq('user_id', sub.user_id)
      .eq('course_id', sub.course_id)
      .eq('status', 'active');

    await supabase.from('ssra_notifications').insert({
      user_id: sub.user_id,
      type: 'subscription',
      title: 'Subscription ended',
      body: 'Your subscription has ended. You can resubscribe anytime to regain access.',
      link: '/dashboard',
    });
  }
}


// Append an immutable row to the revenue_events ledger. Idempotent via the
// UNIQUE(paddle_event_id) constraint — duplicate inserts are silently ignored.
async function logRevenueEvent(
  eventType: string,
  eventId: string | undefined,
  env: PaddleEnv,
  data: any,
) {
  if (!eventId) return;
  try {
    const totals = data?.details?.totals ?? data?.payout?.totals ?? {};
    const amount = Number(totals.total ?? totals.grandTotal ?? data?.amount ?? 0) || 0;
    const fee = Number(totals.fee ?? 0) || 0;
    const tax = Number(totals.tax ?? 0) || 0;
    const earnings = Number(totals.earnings ?? (amount - fee - tax)) || 0;
    const custom = data?.customData ?? {};
    const isDebit = eventType.startsWith('adjustment.') || eventType.includes('refund') || eventType.includes('chargeback');

    const { error } = await getSupabase().from('revenue_events').insert({
      paddle_event_id: eventId,
      event_type: eventType,
      paddle_transaction_id: data?.transactionId ?? data?.id ?? null,
      paddle_subscription_id: data?.subscriptionId ?? null,
      paddle_customer_id: data?.customerId ?? null,
      user_id: custom.userId ?? null,
      course_id: custom.courseId ?? null,
      enrollment_id: custom.enrollmentId ?? null,
      amount_cents: Math.abs(Math.round(amount)),
      fee_cents: Math.abs(Math.round(fee)),
      tax_cents: Math.abs(Math.round(tax)),
      net_cents: Math.abs(Math.round(earnings)),
      currency: data?.currencyCode ?? totals.currencyCode ?? 'EUR',
      environment: env,
      direction: isDebit ? 'debit' : 'credit',
      occurred_at: data?.occurredAt ?? data?.createdAt ?? new Date().toISOString(),
      raw_payload: data ?? {},
    });
    if (error && !String(error.message ?? '').includes('duplicate')) {
      console.error('revenue ledger insert failed:', error);
    }
  } catch (e) {
    console.error('logRevenueEvent error (non-blocking):', e);
  }
}

// Append to immutable payment_audit_log. Idempotent via UNIQUE(paddle_event_id).
async function logAuditEvent(
  eventType: string,
  eventId: string | undefined,
  env: PaddleEnv,
  data: any,
  severity: 'info' | 'warn' | 'critical' = 'info',
) {
  try {
    const totals = data?.details?.totals ?? data?.payout?.totals ?? {};
    const amount = Number(totals.total ?? totals.grandTotal ?? data?.amount ?? 0) || 0;
    const isDebit = eventType.startsWith('adjustment.') || eventType.includes('refund') || eventType.includes('chargeback');
    const custom = data?.customData ?? {};
    const { error } = await getSupabase().from('payment_audit_log').insert({
      environment: env,
      event_type: `webhook.${eventType}`,
      paddle_event_id: eventId ?? null,
      paddle_resource_id: data?.id ?? data?.transactionId ?? data?.subscriptionId ?? null,
      user_id: custom.userId ?? null,
      enrollment_id: custom.enrollmentId ?? null,
      amount_cents: amount ? Math.abs(Math.round(amount)) : null,
      currency: data?.currencyCode ?? totals.currencyCode ?? 'EUR',
      direction: amount ? (isDebit ? 'debit' : 'credit') : null,
      actor: 'webhook',
      severity,
      after_state: data ?? {},
    });
    if (error && !String(error.message ?? '').includes('duplicate')) {
      console.error('audit log insert failed:', error);
    }
  } catch (e) {
    console.error('logAuditEvent error (non-blocking):', e);
  }
}

async function handleWebhook(req: Request): Promise<{ eventType: string; eventId: string | undefined; env: string; skipped?: boolean }> {
  const { event, env } = await verifyAndDetectEnv(req);
  const eventType = event.eventType as string;
  const eventId   = (event.notificationId ?? event.id) as string | undefined;

  // Idempotency: reject duplicate events BEFORE any side-effects.
  if (eventId) {
    const { data: existing } = await getSupabase()
      .from('ssra_webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing) {
      console.log(`Duplicate event ${eventId} (prev status: ${existing.status}), skipping`);
      return { eventType, eventId, env, skipped: true };
    }
  }

  console.log('paddle event:', eventType, 'env:', env);
  switch (eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      await logRevenueEvent(eventType, eventId, env, event.data);
      break;
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case 'adjustment.created':
    case 'adjustment.updated':
      await handleAdjustmentEvent(event.data, env);
      await logRevenueEvent(eventType, eventId, env, event.data);
      break;
    default:
      break;
  }
  // Always capture into the audit ledger (idempotent on paddle_event_id).
  await logAuditEvent(eventType, eventId, env, event.data);
  return { eventType, eventId, env };
}

async function logWebhookEvent(
  eventType: string,
  eventId: string | undefined,
  env: string,
  status: 'processed' | 'failed' | 'skipped',
  errorMessage?: string,
  payload?: unknown,
) {
  try {
    await getSupabase().from('ssra_webhook_events').insert({
      event_type:    eventType,
      event_id:      eventId ?? null,
      environment:   env,
      status,
      error_message: errorMessage ?? null,
      payload:       payload ? JSON.parse(JSON.stringify(payload)) : null,
    });
  } catch (e) {
    console.error('Failed to log webhook event:', e);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let eventType = 'unknown';
  let eventId: string | undefined;
  let env = 'unknown';
  try {
    const result = await handleWebhook(req);
    eventType = result?.eventType ?? 'unknown';
    eventId   = result?.eventId;
    env       = result?.env ?? 'unknown';
    if (result?.skipped) {
      // Duplicate event — already processed; return 200 so Paddle stops retrying.
      await logWebhookEvent(eventType, eventId, env, 'skipped');
    } else {
      await logWebhookEvent(eventType, eventId, env, 'processed');
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    await logWebhookEvent(eventType, eventId, env, 'failed', (e as Error).message);
    return new Response('Webhook error', { status: 400 });
  }
});
