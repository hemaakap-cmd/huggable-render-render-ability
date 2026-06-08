// Admin approves/rejects a cancellation request.
// On approve: cancels enrollment + (optionally) issues a Paddle refund via the adjustments API.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

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
    const { data: userData } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Admin gate (server-side)
    const { data: profile } = await admin
      .from('ssra_profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId : null;
    const decision = body.decision === 'approve' || body.decision === 'reject' ? body.decision : null;
    const adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.slice(0, 1000) : null;
    const issueRefund = body.issueRefund !== false; // default true on approve
    const environment: PaddleEnv = body.environment === 'live' ? 'live' : 'sandbox';

    if (!requestId || !decision) {
      return new Response(JSON.stringify({ error: 'requestId and decision are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: cancelReq, error: rErr } = await admin
      .from('ssra_cancellation_requests')
      .select('id, status, enrollment_id, user_id, course_id, refund_amount_eur')
      .eq('id', requestId)
      .maybeSingle();
    if (rErr || !cancelReq) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (cancelReq.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Request is already ${cancelReq.status}` }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (decision === 'reject') {
      await admin.from('ssra_cancellation_requests').update({
        status: 'rejected',
        admin_notes: adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);

      await admin.from('ssra_notifications').insert({
        user_id: cancelReq.user_id,
        type: 'cancellation',
        title: 'Cancellation request declined',
        body: adminNotes ?? 'Your cancellation request was reviewed and could not be approved.',
        link: '/dashboard/courses',
      });

      return new Response(JSON.stringify({ ok: true, status: 'rejected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Approve: cancel enrollment first
    const { data: enrollment } = await admin
      .from('ssra_enrollments')
      .select('id, stripe_payment_intent, amount_eur, course_title_snapshot, student_email_snapshot, student_name_snapshot, order_number')
      .eq('id', cancelReq.enrollment_id)
      .maybeSingle();

    await admin.from('ssra_enrollments').update({
      status: 'cancelled',
    }).eq('id', cancelReq.enrollment_id);

    // Revoke any certificates the student earned for this course.
    // A refunded student should not retain a certificate they were effectively
    // given access to for free. Revocation is surfaced to them via MyCertificates.tsx.
    await admin.from('ssra_certificates')
      .update({ revoked: true, revoked_reason: 'Enrollment cancelled and refunded' })
      .eq('user_id', cancelReq.user_id)
      .eq('course_id', cancelReq.course_id)
      .eq('revoked', false);

    let paddleAdjustmentId: string | null = null;
    let refundError: string | null = null;

    // stripe_payment_intent column stores the Paddle transaction ID (txn_xxx)
    const txnId = enrollment?.stripe_payment_intent as string | undefined;

    if (issueRefund && txnId) {
      try {
        const txnRes = await gatewayFetch(environment, `/transactions/${encodeURIComponent(txnId)}`);
        const txnJson = await txnRes.json();
        const items = txnJson?.data?.details?.line_items ?? txnJson?.data?.items ?? [];
        const item = Array.isArray(items) && items.length > 0 ? items[0] : null;
        const itemId = item?.id ?? item?.item_id ?? null;

        if (!itemId) throw new Error('Could not resolve transaction item to refund');

        const adjRes = await gatewayFetch(environment, '/adjustments', {
          method: 'POST',
          body: JSON.stringify({
            action: 'refund',
            transaction_id: txnId,
            reason: 'Customer cancelled within 14-day window',
            items: [{ item_id: itemId, type: 'full' }],
          }),
        });
        const adjJson = await adjRes.json();
        if (!adjRes.ok) throw new Error(adjJson?.error?.detail ?? `Paddle refund failed (${adjRes.status})`);
        paddleAdjustmentId = adjJson?.data?.id ?? null;
      } catch (e) {
        refundError = (e as Error).message;
        console.error('paddle refund failed', e);
      }
    }

    const refundIssued = !!paddleAdjustmentId;

    await admin.from('ssra_cancellation_requests').update({
      status: refundIssued ? 'refunded' : 'approved',
      admin_notes: adminNotes ?? (refundError ? `Refund must be issued manually: ${refundError}` : null),
      paddle_adjustment_id: paddleAdjustmentId,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId);

    await admin.from('ssra_notifications').insert({
      user_id: cancelReq.user_id,
      type: 'cancellation',
      title: 'Cancellation approved',
      body: refundIssued
        ? `Your enrollment was cancelled and a refund has been issued. It may take 5–10 business days to appear on your statement.`
        : `Your enrollment was cancelled. ${refundError ? 'Our team will process the refund manually and contact you shortly.' : ''}`,
      link: '/dashboard/courses',
    });

    return new Response(JSON.stringify({
      ok: true,
      status: refundIssued ? 'refunded' : 'approved',
      paddleAdjustmentId,
      refundError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-process-cancellation error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
