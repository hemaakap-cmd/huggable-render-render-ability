/**
 * health-check — Public endpoint for external uptime monitors.
 *
 * GET  /health-check          → { status, services, timestamp }
 * POST /health-check          → same (some monitors use POST)
 *
 * HTTP status codes:
 *   200 = all services healthy
 *   207 = some services degraded
 *   503 = one or more services down
 *
 * Public response is intentionally minimal: per-service status only,
 * with no raw error messages or internal metrics.
 *
 * Authenticated callers (Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>)
 * also receive detailed `detail` fields and the `metrics` block.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { pingPaddleGateway } from '../_shared/paddle.ts';

const VERSION = '1.0.0';

type ServiceStatus = 'ok' | 'degraded' | 'down';

interface ServiceResult {
  status: ServiceStatus;
  latencyMs?: number;
  detail?: string;
}

function createSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Generic, non-leaky labels for public consumers.
const GENERIC_DOWN = 'service unavailable';
const GENERIC_DEGRADED = 'service degraded';

async function checkDatabase(): Promise<ServiceResult> {
  try {
    const t0 = Date.now();
    const supabase = createSupabase();
    const { error } = await supabase
      .from('ssra_courses')
      .select('id', { head: true, count: 'exact' });
    if (error) return { status: 'down', detail: error.message };
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e) {
    return { status: 'down', detail: (e as Error).message };
  }
}

async function checkEmailQueue(): Promise<ServiceResult> {
  try {
    const supabase = createSupabase();
    const stuckSince = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('email_send_log')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', stuckSince);

    if (error) return { status: 'degraded', detail: error.message };
    const stuck = count ?? 0;
    if (stuck > 100) return { status: 'down',     detail: `${stuck} emails stuck > 30 min` };
    if (stuck > 20)  return { status: 'degraded', detail: `${stuck} emails pending > 30 min` };
    return { status: 'ok' };
  } catch (e) {
    return { status: 'degraded', detail: (e as Error).message };
  }
}

async function checkPayments(): Promise<ServiceResult> {
  try {
    const supabase = createSupabase();
    const since2h = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('ssra_enrollments')
      .select('id', { head: true, count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', since2h);

    if (error) return { status: 'degraded', detail: error.message };
    const stale = count ?? 0;
    if (stale > 20) return { status: 'degraded', detail: `${stale} stale pending enrollments (webhook delay?)` };
    return { status: 'ok' };
  } catch (e) {
    return { status: 'degraded', detail: (e as Error).message };
  }
}

async function checkAuth(): Promise<ServiceResult> {
  try {
    const supabase = createSupabase();
    const t0 = Date.now();
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) return { status: 'degraded', detail: error.message };
    return { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e) {
    return { status: 'degraded', detail: (e as Error).message };
  }
}

async function checkPaddleGateway(): Promise<ServiceResult> {
  try {
    const env = Deno.env.get('PADDLE_LIVE_API_KEY') ? 'live' : 'sandbox';
    const r = await pingPaddleGateway(env as 'live' | 'sandbox');
    if (!r.ok) return { status: 'down', latencyMs: r.latencyMs, detail: r.error ?? `HTTP ${r.status}` };
    if (r.latencyMs > 3000) return { status: 'degraded', latencyMs: r.latencyMs, detail: 'High gateway latency' };
    return { status: 'ok', latencyMs: r.latencyMs };
  } catch (e) {
    return { status: 'degraded', detail: (e as Error).message };
  }
}

async function getMetrics() {
  const supabase = createSupabase();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [failedEmailsRes, dlqEmailsRes, activeEnrollRes, webhookSuccessRes, webhookFailRes] = await Promise.allSettled([
    supabase.from('email_send_log').select('id', { head: true, count: 'exact' }).in('status', ['failed', 'bounced']).gte('created_at', since24h),
    supabase.from('email_send_log').select('id', { head: true, count: 'exact' }).eq('status', 'dlq').gte('created_at', since24h),
    supabase.from('ssra_enrollments').select('id', { head: true, count: 'exact' }).eq('status', 'active').gte('enrolled_at', since24h),
    (supabase as any).from('ssra_webhook_events').select('id', { head: true, count: 'exact' }).eq('status', 'processed').gte('processed_at', since24h),
    (supabase as any).from('ssra_webhook_events').select('id', { head: true, count: 'exact' }).eq('status', 'failed').gte('processed_at', since24h),
  ]);

  return {
    failedEmails24h:   failedEmailsRes.status   === 'fulfilled' ? (failedEmailsRes.value.count ?? 0) : 0,
    dlqEmails24h:      dlqEmailsRes.status      === 'fulfilled' ? (dlqEmailsRes.value.count ?? 0) : 0,
    enrollments24h:    activeEnrollRes.status   === 'fulfilled' ? (activeEnrollRes.value.count ?? 0) : 0,
    webhookSuccess24h: webhookSuccessRes.status === 'fulfilled' ? (webhookSuccessRes.value.count ?? 0) : 0,
    webhookFailed24h:  webhookFailRes.status    === 'fulfilled' ? (webhookFailRes.value.count ?? 0) : 0,
  };
}

function sanitizeService(r: ServiceResult): ServiceResult {
  // Strip raw error messages from the public response. Keep status +
  // latency so monitors can still graph response time, but replace
  // detail with a generic label that does not leak schema or stack info.
  const out: ServiceResult = { status: r.status };
  if (typeof r.latencyMs === 'number') out.latencyMs = r.latencyMs;
  if (r.status === 'down') out.detail = GENERIC_DOWN;
  else if (r.status === 'degraded') out.detail = GENERIC_DEGRADED;
  return out;
}

function isAuthorizedForDetails(req: Request): boolean {
  const expected = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  return token.length > 0 && token === expected;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const start = Date.now();
  const includeDetails = isAuthorizedForDetails(req);

  const detailedPromises: [
    Promise<ServiceResult>, Promise<ServiceResult>, Promise<ServiceResult>,
    Promise<ServiceResult>, Promise<ServiceResult>,
  ] = [
    checkDatabase(), checkEmailQueue(), checkPayments(), checkAuth(), checkPaddleGateway(),
  ];

  const [database, email, payments, auth, paddleGateway] = await Promise.all(detailedPromises);
  const detailedServices = { database, email, payments, auth, paddleGateway };

  const allStatuses = Object.values(detailedServices).map((s) => s.status);
  const overallStatus: ServiceStatus = allStatuses.includes('down')
    ? 'down'
    : allStatuses.includes('degraded')
    ? 'degraded'
    : 'ok';

  const httpStatus = overallStatus === 'down' ? 503 : overallStatus === 'degraded' ? 207 : 200;

  const publicServices = Object.fromEntries(
    Object.entries(detailedServices).map(([k, v]) => [k, sanitizeService(v)]),
  );

  const body: Record<string, unknown> = {
    status:         overallStatus,
    version:        VERSION,
    timestamp:      new Date().toISOString(),
    responseTimeMs: Date.now() - start,
    services:       includeDetails ? detailedServices : publicServices,
  };

  if (includeDetails) {
    body.metrics = await getMetrics();
  }

  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
