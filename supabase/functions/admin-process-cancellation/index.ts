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
    let subscriptionCancelError: string | null = null;

    // stripe_payment_intent column stores the Paddle transaction ID (txn_xxx)
    const txnId = enrollment?.stripe_payment_intent as string | undefined;

    // Resolve the correct Paddle environment from the matching revenue_event,
    // because the admin UI may not pass it (or may pass the wrong one).
    // Falls back to the request body / 'live' so a live txn isn't accidentally
    // queried against sandbox.
    let resolvedEnv: PaddleEnv = environment;
    let subscriptionId: string | null = null;
    if (txnId) {
      const { data: re } = await admin
        .from('revenue_events')
        .select('environment, paddle_subscription_id')
        .eq('paddle_transaction_id', txnId)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (re?.environment === 'live' || re?.environment === 'sandbox') {
        resolvedEnv = re.environment as PaddleEnv;
      }
      subscriptionId = (re?.paddle_subscription_id as string | null) ?? null;
    }

    // Cancel the recurring Paddle subscription so the customer is not charged again.
    if (subscriptionId) {
      try {
        const cancelRes = await gatewayFetch(
          resolvedEnv,
          `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
          { method: 'POST', body: JSON.stringify({ effective_from: 'immediately' }) },
        );
        if (!cancelRes.ok) {
          const j = await cancelRes.json().catch(() => ({}));
          // 409 / already canceled is fine.
          if (cancelRes.status !== 409) {
            subscriptionCancelError = j?.error?.detail ?? `Subscription cancel failed (${cancelRes.status})`;
          }
        }
      } catch (e) {
        subscriptionCancelError = (e as Error).message;
        console.error('paddle subscription cancel failed', e);
      }
    }

    // Refund policy: customer keeps 80%, SSRA Academy retains 20% as an
    // administrative fee. Compute the partial refund per transaction line item
    // from the amount the customer actually paid (gross total, incl. tax).
    let refundedAmountCents = 0;
    let adminFeeCents = 0;
    let currencyCode = 'EUR';
    if (issueRefund && txnId) {
      try {
        // Refundable line items live on the transaction's details.line_items[].
        // Paddle only populates this reliably when the transaction is fetched
        // with ?include=details (and the camelCase `details.lineItems` shape can
        // appear depending on SDK/gateway). We request the include explicitly
        // and accept every known shape so the refund stops silently failing with
        // "Could not resolve transaction item to refund" (finding M1, 2026-06-13).
        const txnRes = await gatewayFetch(
          resolvedEnv,
          `/transactions/${encodeURIComponent(txnId)}?include=details`,
        );
        if (!txnRes.ok) {
          const body = await txnRes.text().catch(() => '');
          throw new Error(`Paddle transaction fetch failed (${txnRes.status}, env=${resolvedEnv}) ${body}`.trim());
        }
        const txnJson = await txnRes.json();
        const txn = txnJson?.data ?? {};
        currencyCode = txn?.currency_code ?? txn?.currencyCode ?? 'EUR';
        const items =
          txn?.details?.line_items ??
          txn?.details?.lineItems ??
          txn?.line_items ??
          txn?.items ??
          [];
        if (!Array.isArray(items) || items.length === 0) {
          throw new Error(
            `Could not resolve transaction items to refund (txn=${txnId}, env=${resolvedEnv}, status=${txn?.status ?? 'unknown'})`,
          );
        }

        const refundItems = items.map((it: any) => {
          // Line-item id (txnitm_…) is `id`; older shapes nest it differently.
          const itemId = it?.id ?? it?.item_id ?? it?.itemId;
          if (!itemId) throw new Error('Missing line item id on transaction');
          // totals.total = gross (incl. tax) in the lowest denomination, as a
          // string; tolerate snake/camel and unit_totals fallbacks.
          const grossStr =
            it?.totals?.total ?? it?.totals?.subtotal ??
            it?.unit_totals?.total ?? it?.unitTotals?.total ?? '0';
          const gross = Number(grossStr);
          if (!Number.isFinite(gross) || gross <= 0) {
            throw new Error(`Invalid line item total for refund: ${grossStr}`);
          }
          // 80% refund, rounded down to the cent (admin fee absorbs the rounding).
          const refundCents = Math.floor(gross * 0.8);
          refundedAmountCents += refundCents;
          adminFeeCents += gross - refundCents;
          return { item_id: itemId, type: 'partial', amount: String(refundCents) };
        });

        const adjRes = await gatewayFetch(resolvedEnv, '/adjustments', {
          method: 'POST',
          body: JSON.stringify({
            action: 'refund',
            transaction_id: txnId,
            reason: 'Customer cancellation — 80% refund (20% administrative fee retained per refund policy)',
            items: refundItems,
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
      admin_notes: adminNotes ?? ([
        refundError ? `Refund must be issued manually: ${refundError}` : null,
        subscriptionCancelError ? `Subscription cancel failed: ${subscriptionCancelError}` : null,
      ].filter(Boolean).join(' | ') || null),
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

    // Audit log row for the cancellation action.
    await admin.from('ssra_audit_log').insert({
      actor_id:      user.id,
      actor_email:   user.email ?? null,
      actor_role:    profile.role,
      action:        refundIssued ? 'enrollment_cancelled_with_refund' : 'enrollment_cancelled',
      resource_type: 'ssra_enrollment',
      resource_id:   cancelReq.enrollment_id,
      details: {
        request_id: requestId,
        user_id: cancelReq.user_id,
        course_id: cancelReq.course_id,
        refund_issued: refundIssued,
        paddle_adjustment_id: paddleAdjustmentId,
        refund_error: refundError,
      },
    });

    // Waitlist promotion: the cancelled seat must not vanish silently.
    // Notify the next person waiting on this course so they can act on it.
    try {
      const { data: nextWaiter } = await admin
        .from('ssra_waitlist')
        .select('id, user_id, position')
        .eq('course_id', cancelReq.course_id)
        .eq('status', 'waiting')
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextWaiter) {
        const courseTitle = enrollment?.course_title_snapshot ?? cancelReq.course_id;
        await admin.from('ssra_waitlist').update({
          status: 'notified',
          notified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        }).eq('id', nextWaiter.id);

        await admin.from('ssra_notifications').insert({
          user_id: nextWaiter.user_id,
          type: 'waitlist_promoted',
          title: 'A seat just opened up!',
          body: `A seat is available in ${courseTitle}. You have 48 hours to enroll before we offer it to the next person on the waitlist.`,
          link: `/courses/${cancelReq.course_id}`,
        });

        // Best-effort branded email so the user sees it even when off-site.
        try {
          const { data: waiterProfile } = await admin
            .from('ssra_profiles')
            .select('email, full_name')
            .eq('id', nextWaiter.user_id)
            .maybeSingle();
          if (waiterProfile?.email) {
            const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${svc}` },
              body: JSON.stringify({
                templateName: 'waitlist-seat-open',
                recipientEmail: waiterProfile.email,
                idempotencyKey: `waitlist-open-${nextWaiter.id}`,
                templateData: {
                  studentName: waiterProfile.full_name ?? 'there',
                  courseName: courseTitle,
                  enrollUrl: `https://ssracourses.com/courses/${cancelReq.course_id}`,
                  expiresInHours: 48,
                },
              }),
            });
          }
        } catch (e) {
          console.error('waitlist email failed (non-blocking):', e);
        }
      }
    } catch (e) {
      console.error('waitlist promotion failed (non-blocking):', e);
    }

    // Send branded cancellation confirmation email to the student (best-effort).
    try {
      const recipient = enrollment?.student_email_snapshot;
      if (recipient) {
        const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const fmtMoney = (cents: number) =>
          `${currencyCode} ${(cents / 100).toFixed(2)}`;
        const paidStr = `EUR ${Number(enrollment?.amount_eur ?? 0).toFixed(2)}`;
        const refundStr = refundedAmountCents > 0
          ? fmtMoney(refundedAmountCents)
          : paidStr;
        const adminFeeStr = adminFeeCents > 0
          ? fmtMoney(adminFeeCents)
          : null;
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${svc}` },
          body: JSON.stringify({
            templateName: 'cancellation-confirmation',
            recipientEmail: recipient,
            idempotencyKey: `cancel-confirm-${requestId}`,
            templateData: {
              studentName: enrollment?.student_name_snapshot ?? 'Student',
              courseName: enrollment?.course_title_snapshot ?? cancelReq.course_id,
              orderNumber: enrollment?.order_number ?? enrollment?.id,
              amountPaid: paidStr,
              refundIssued,
              refundAmount: refundStr,
              administrativeFee: adminFeeStr,
              refundPolicyNote: refundIssued
                ? 'Per our refund policy, a 20% administrative fee is retained and 80% of your payment is refunded.'
                : null,
              cancellationDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            },
          }),
        });
      }
    } catch (e) {
      console.error('cancellation email failed', e);
    }


    return new Response(JSON.stringify({
      ok: true,
      status: refundIssued ? 'refunded' : 'approved',
      paddleAdjustmentId,
      refundError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-process-cancellation error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
