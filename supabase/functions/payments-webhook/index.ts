// Paddle webhook — auto-enroll student on payment, send confirmation + admin notice.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

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

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  console.log('paddle event:', event.eventType);
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      // subscription.* and transaction.payment_failed land here — not used yet.
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
