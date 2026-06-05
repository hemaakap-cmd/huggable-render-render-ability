// Student creates a cancellation request for a paid enrollment.
// Allowed only within 14 days of payment and only while enrollment is active.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!enrollmentId || reason.length < 5 || reason.length > 1000) {
      return new Response(JSON.stringify({ error: 'enrollmentId and a reason (5–1000 chars) are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: enrollment, error: eErr } = await admin
      .from('ssra_enrollments')
      .select('id, user_id, course_id, status, paid_at, amount_eur, order_number, course_title_snapshot, student_name_snapshot, student_email_snapshot')
      .eq('id', enrollmentId)
      .maybeSingle();

    if (eErr || !enrollment) {
      return new Response(JSON.stringify({ error: 'Enrollment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (enrollment.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (enrollment.status !== 'active' || !enrollment.paid_at) {
      return new Response(JSON.stringify({ error: 'Only paid, active enrollments can be cancelled' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paidAt = new Date(enrollment.paid_at).getTime();
    const ageDays = (Date.now() - paidAt) / 86_400_000;
    if (ageDays > 14) {
      return new Response(JSON.stringify({
        error: 'The 14-day cancellation window has ended for this enrollment.',
        daysSincePayment: Math.floor(ageDays),
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // One open request per enrollment (enforced by unique index too)
    const { data: existing } = await admin
      .from('ssra_cancellation_requests')
      .select('id, status')
      .eq('enrollment_id', enrollmentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'A cancellation request is already pending for this enrollment.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: inserted, error: insErr } = await admin
      .from('ssra_cancellation_requests')
      .insert({
        enrollment_id: enrollmentId,
        user_id: user.id,
        course_id: enrollment.course_id,
        reason,
        status: 'pending',
        refund_amount_eur: enrollment.amount_eur,
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('cancellation insert failed', insErr);
      return new Response(JSON.stringify({ error: 'Could not submit request' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Notify the student that the request was received.
    await admin.from('ssra_notifications').insert({
      user_id: user.id,
      type: 'cancellation',
      title: 'Cancellation request received',
      body: `We've received your cancellation request for ${enrollment.course_title_snapshot ?? 'your course'}. Our team will review it within 1–3 business days.`,
      link: '/dashboard/courses',
    });

    // Notify admin via email (best-effort; ignore failures).
    try {
      const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${svc}` },
        body: JSON.stringify({
          templateName: 'admin-purchase-notification',
          recipientEmail: 'hemaakap@gmail.com',
          idempotencyKey: `cancel-req-${inserted.id}`,
          templateData: {
            studentName: enrollment.student_name_snapshot ?? 'Student',
            studentEmail: enrollment.student_email_snapshot ?? user.email,
            courseName: `[CANCELLATION REQUEST] ${enrollment.course_title_snapshot ?? enrollment.course_id}`,
            orderNumber: enrollment.order_number ?? enrollment.id,
            amountPaid: `EUR ${Number(enrollment.amount_eur ?? 0).toFixed(2)}`,
            environment: 'request',
            transactionId: `Reason: ${reason.slice(0, 180)}`,
          },
        }),
      });
    } catch (e) { console.error('admin notify failed', e); }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('request-enrollment-cancellation error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
