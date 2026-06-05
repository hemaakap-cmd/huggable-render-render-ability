// Handlers extracted from the webhook entrypoint so they can be unit-tested
// without importing the Paddle SDK (which needs node_modules in the test runner).
import { createClient } from 'npm:@supabase/supabase-js@2';
type PaddleEnv = 'sandbox' | 'live';

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

// Marks a cancellation request as `refunded` once Paddle confirms the
// adjustment is approved (post-webhook authoritative state).
export async function handleAdjustmentEvent(data: any, _env: PaddleEnv) {
  const adjustmentId = data?.id;
  const status = data?.status;
  if (!adjustmentId || status !== 'approved') return;

  const supabase = getSupabase() as any;
  const { data: row } = await supabase
    .from('ssra_cancellation_requests')
    .select('id, user_id, status')
    .eq('paddle_adjustment_id', adjustmentId)
    .maybeSingle();
  if (!row || row.status === 'refunded') return;

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
