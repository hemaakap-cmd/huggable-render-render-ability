// Paddle webhook — auto-enroll student on payment, send confirmation + admin notice.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';
import { handleAdjustmentEvent } from './handlers.ts';

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

  // Activate enrollment
  const { data: enrollment, error: updateErr } = await supabase
    .from('ssra_enrollments')
    .update({
      status: 'active',
      paid_at: new Date().toISOString(),
      enrolled_at: new Date().toISOString(),
      stripe_payment_intent: data.id, // reuse column for Paddle transaction id
    })
    .eq('id', enrollmentId)
    .select('id, order_number, amount_eur, course_title_snapshot, student_name_snapshot, student_email_snapshot, start_date_snapshot, start_time_snapshot, duration_snapshot, instructor_snapshot')
    .maybeSingle();

  if (updateErr || !enrollment) {
    console.error('enrollment update failed', updateErr, enrollmentId);
    return;
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
      .select('student_email_snapshot, student_name_snapshot, course_title_snapshot, order_number')
      .maybeSingle();

    if (enr?.student_email_snapshot) {
      await sendEmail('enrollment-confirmation', enr.student_email_snapshot, `paddle-sub-enr-${data.id}`, {
        studentName: enr.student_name_snapshot ?? 'Student',
        courseName: enr.course_title_snapshot ?? courseId,
        orderNumber: enr.order_number ?? data.id,
        dashboardUrl: `${SITE_URL}/dashboard`,
      });
      await sendEmail('admin-purchase-notification', ADMIN_NOTIFY_EMAIL, `paddle-sub-admin-${data.id}`, {
        studentName: enr.student_name_snapshot ?? 'Student',
        studentEmail: enr.student_email_snapshot,
        courseName: enr.course_title_snapshot ?? courseId,
        orderNumber: enr.order_number ?? data.id,
        amountPaid: 'Monthly subscription',
        environment: _env,
        transactionId: data.id,
      });
    }

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

// Exported for E2E tests. Marks a cancellation request as `refunded` once
// Paddle confirms the adjustment is approved (post-webhook authoritative state).
export async function handleAdjustmentEvent(data: any, _env: PaddleEnv) {
  const adjustmentId = data?.id;
  const status = data?.status;
  if (!adjustmentId || status !== 'approved') return;

  const supabase = getSupabase();
  const { data: row } = await supabase
    .from('ssra_cancellation_requests')
    .select('id, user_id, status')
    .eq('paddle_adjustment_id', adjustmentId)
    .maybeSingle();
  if (!row) return;
  if (row.status === 'refunded') return;

  await supabase
    .from('ssra_cancellation_requests')
    .update({ status: 'refunded' })
    .eq('id', row.id);

  await supabase.from('ssra_notifications').insert({
    user_id: row.user_id,
    type: 'cancellation',
    title: 'Refund completed',
    body: 'Your refund has been approved by Paddle. It may take 5–10 business days to appear on your statement.',
    link: '/dashboard/courses',
  });
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  console.log('paddle event:', event.eventType);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
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
    case 'adjustment.created' as any:
    case 'adjustment.updated' as any:
      await handleAdjustmentEvent(event.data, env);
      break;
    default:
      break;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
