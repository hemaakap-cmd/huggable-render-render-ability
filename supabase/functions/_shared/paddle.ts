import { Environment, Paddle, EventName } from 'npm:@paddle/paddle-node-sdk';

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };

export type PaddleEnv = 'sandbox' | 'live';

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev/paddle';

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === 'sandbox'
    ? getEnv('PADDLE_SANDBOX_API_KEY')
    : getEnv('PADDLE_LIVE_API_KEY');
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');
  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      'X-Connection-Api-Key': connectionApiKey,
      'Lovable-API-Key': lovableApiKey,
    },
  });
}

export interface GatewayFetchOptions {
  /** Max attempts including the first try. Default: 4. */
  maxAttempts?: number;
  /** Base backoff in ms (exponential). Default: 300. */
  baseDelayMs?: number;
  /** Per-attempt timeout in ms. Default: 15000. */
  timeoutMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init?: RequestInit,
  opts: GatewayFetchOptions = {},
): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 300;
  const timeoutMs = opts.timeoutMs ?? 15_000;

  // Only retry idempotent methods by default. POST/PATCH/DELETE retry only on
  // network errors and 429/503 (never on 5xx that may have committed state).
  const method = (init?.method ?? 'GET').toUpperCase();
  const idempotent = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${GATEWAY_BASE_URL}${path}`, {
        ...init,
        signal: init?.signal ?? ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
          ...init?.headers,
        },
      });
      clearTimeout(timer);

      const isRetryable = idempotent
        ? RETRYABLE_STATUS.has(res.status)
        : (res.status === 429 || res.status === 503);

      if (!isRetryable || attempt === maxAttempts) return res;

      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      console.warn(`[paddle gateway] ${method} ${path} → ${res.status}, retry ${attempt}/${maxAttempts - 1} in ${backoff}ms`);
      await sleep(backoff);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      // Network error / timeout. Retry idempotent always; non-idempotent only
      // if the request never reached the server (AbortError on timeout is safe
      // to retry because we cannot distinguish "sent" from "not sent", but
      // erring on the side of not double-charging is critical → only retry
      // idempotent here).
      if (!idempotent || attempt === maxAttempts) throw e;
      const backoff = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      console.warn(`[paddle gateway] ${method} ${path} network error, retry ${attempt}/${maxAttempts - 1} in ${backoff}ms:`, (e as Error)?.message);
      await sleep(backoff);
    }
  }
  // Unreachable, but keeps TS happy.
  throw lastErr ?? new Error('gatewayFetch exhausted retries');
}

/** Lightweight liveness probe against the Paddle gateway. */
export async function pingPaddleGateway(env: PaddleEnv): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    const res = await gatewayFetch(env, '/event-types', { method: 'GET' }, { maxAttempts: 1, timeoutMs: 5000 });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - started };
  } catch (e) {
    return { ok: false, status: 0, latencyMs: Date.now() - started, error: (e as Error)?.message ?? 'unknown' };
  }
}


export function getWebhookSecret(env: PaddleEnv): string {
  return env === 'sandbox'
    ? getEnv('PAYMENTS_SANDBOX_WEBHOOK_SECRET')
    : getEnv('PAYMENTS_LIVE_WEBHOOK_SECRET');
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get('paddle-signature');
  const body = await req.text();
  const secret = getWebhookSecret(env);
  if (!signature || !body) throw new Error('Missing signature or body');
  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}
