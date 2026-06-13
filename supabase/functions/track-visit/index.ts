import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function deviceFromUA(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get('SUPABASE_JWKS') ?? 'salt'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    // SECURITY: Ignore any user_id sent in the request body — clients used to
    // pass it explicitly, which let unauthenticated callers spoof another
    // user's UUID into analytics. Derive user_id ONLY from the verified JWT.
    const { session_id, path, referrer, utm } = body ?? {};
    if (!session_id || typeof session_id !== 'string') {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let resolvedUserId: string | null = null;
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      // Service-role / anon keys are JWTs but not user JWTs — getUser returns
      // an error for those, which we treat as "no user".
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) resolvedUserId = user.id;
    }

    // Cloudflare / proxy geo headers (when present)
    let country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null;
    let city = req.headers.get('cf-ipcity') || req.headers.get('x-vercel-ip-city') || null;
    let region = req.headers.get('cf-region') || req.headers.get('x-vercel-ip-region') || null;
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim() || 'unknown';
    const ua = req.headers.get('user-agent') ?? '';

    // Fallback: lookup geo from IP via ipapi.co (free, no key) if no proxy headers
    if (!country && ip && ip !== 'unknown' && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'ssra-analytics/1.0' },
          signal: AbortSignal.timeout(2500),
        });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (!geo.error) {
            country = geo.country_name || geo.country || null;
            city = geo.city || null;
            region = geo.region || null;
          }
        }
      } catch { /* silent — geo lookup is best-effort */ }
    }

    const ip_hash = await hashIp(ip);
    const now = new Date().toISOString();

    // Upsert by session_id
    const { data: existing } = await supabase
      .from('site_visitor_sessions')
      .select('id, page_views, path, country, city, region')
      .eq('session_id', session_id)
      .maybeSingle();

    if (existing) {
      const samePath = existing.path === (path ?? '/');
      await supabase
        .from('site_visitor_sessions')
        .update({
          last_seen_at: now,
          path: path ?? existing.path,
          page_views: samePath ? existing.page_views : (existing.page_views ?? 0) + 1,
          user_id: resolvedUserId,
          country: existing.country ?? country,
          country_code: (existing as any).country_code ?? country,
          city: existing.city ?? city,
          region: existing.region ?? region,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('site_visitor_sessions').insert({
        session_id,
        user_id: resolvedUserId,
        path: path ?? '/',
        country, country_code: country, city, region,
        referrer: referrer ?? null,
        utm_source: utm?.source ?? null,
        utm_medium: utm?.medium ?? null,
        utm_campaign: utm?.campaign ?? null,
        user_agent: ua.slice(0, 500),
        device_type: deviceFromUA(ua),
        ip_hash,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
