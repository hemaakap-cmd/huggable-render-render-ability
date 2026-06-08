// Dev/test helper: cancels the user's `test-course` subscription IMMEDIATELY
// (in Paddle + DB) so the same user can re-enroll without the
// "already enrolled / already subscribed" guard.
// Hardcoded to course_id='test-course' to avoid affecting real courses.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const TEST_COURSE_ID = 'test-course';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const environment: PaddleEnv = body.environment === 'live' ? 'live' : 'sandbox';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Cancel all Paddle subscriptions for this user on test-course (immediately)
    const { data: subs } = await admin
      .from('ssra_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('course_id', TEST_COURSE_ID);

    const paddleErrors: string[] = [];
    for (const s of subs ?? []) {
      const subId = s.stripe_subscription_id as string | null;
      if (!subId || s.status === 'canceled') continue;
      try {
        const res = await gatewayFetch(
          environment,
          `/subscriptions/${encodeURIComponent(subId)}/cancel`,
          { method: 'POST', body: JSON.stringify({ effective_from: 'immediately' }) },
        );
        if (!res.ok) {
          const t = await res.text();
          paddleErrors.push(`${subId}: ${res.status} ${t.slice(0, 200)}`);
        }
      } catch (e) {
        paddleErrors.push(`${subId}: ${(e as Error).message}`);
      }
    }

    // Force-update DB rows so the user can re-enroll right away (don't wait for webhook)
    await admin
      .from('ssra_subscriptions')
      .update({ status: 'canceled', cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('course_id', TEST_COURSE_ID);

    await admin
      .from('ssra_enrollments')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .eq('course_id', TEST_COURSE_ID)
      .in('status', ['active', 'pending']);

    return json({
      ok: true,
      cancelled_subscriptions: subs?.length ?? 0,
      paddleErrors: paddleErrors.length ? paddleErrors : undefined,
    });
  } catch (e) {
    console.error('dev-cancel-test-subscription error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
