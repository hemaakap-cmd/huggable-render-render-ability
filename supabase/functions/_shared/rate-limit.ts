// Shared rate limiting helper for edge functions.
// Backed by the check_rate_limit() PL/pgSQL function (migration 20260612210000)
// so the counter is shared across all edge function isolates and survives
// cold starts.
//
// FAIL-OPEN policy: if the rate limit check itself errors (DB hiccup), the
// request is allowed. Rate limiting is a hardening layer — it must never
// become a single point of failure that takes payment or login flows down.

// deno-lint-ignore no-explicit-any
type SupabaseAdminClient = any;

export interface RateLimitRule {
  /** Namespaced key, e.g. `coupon:<user_id>` or `otp:<email>` */
  key: string;
  /** Max requests allowed inside one window */
  maxRequests: number;
  /** Window length in seconds */
  windowSeconds: number;
}

/**
 * Returns true if the request is allowed, false if rate-limited.
 * Pass a service-role client — check_rate_limit is service_role-only.
 */
export async function checkRateLimit(
  admin: SupabaseAdminClient,
  rule: RateLimitRule,
): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      _key: rule.key,
      _max_requests: rule.maxRequests,
      _window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("rate-limit check failed (fail-open):", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("rate-limit unexpected error (fail-open):", e);
    return true;
  }
}

/** Standard 429 response body shared by all protected endpoints. */
export function rateLimitedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait a few minutes and try again." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "300" },
    },
  );
}

/** Extract the best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
}
