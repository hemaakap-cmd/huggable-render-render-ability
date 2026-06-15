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

// Comprehensive bot pattern. We do NOT want crawlers/preview-fetchers in stats.
const BOT_RE = /bot|crawler|spider|crawling|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|linkedinbot|twitterbot|embedly|quora|pinterest|bingpreview|googleweblight|google-inspectiontool|chrome-lighthouse|pagespeed|gtmetrix|headlesschrome|phantomjs|puppeteer|playwright|curl|wget|python-requests|axios\/|node-fetch|httpclient|java\/|go-http-client|okhttp/i;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (Deno.env.get('SUPABASE_JWKS') ?? 'salt'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Per-instance cache: ip -> geo (TTL 6h). Reduces external lookups.
type Geo = { country: string | null; country_code: string | null; city: string | null; region: string | null };
const geoCache = new Map<string, { at: number; geo: Geo }>();
const GEO_TTL_MS = 6 * 60 * 60 * 1000;

async function lookupGeo(ip: string): Promise<Geo> {
  const empty: Geo = { country: null, country_code: null, city: null, region: null };
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '::1') return empty;
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL_MS) return cached.geo;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,city,region`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return empty;
    const j = await res.json();
    if (!j?.success) return empty;
    const geo: Geo = {
      country: j.country ?? null,
      country_code: j.country_code ?? null,
      city: j.city ?? null,
      region: j.region ?? null,
    };
    geoCache.set(ip, { at: Date.now(), geo });
    return geo;
  } catch {
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { session_id, path, referrer: rawReferrer, utm } = body ?? {};
    if (!session_id || typeof session_id !== 'string') {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ua = req.headers.get('user-agent') ?? '';
    // Drop bots BEFORE writing to DB so they don't inflate counts.
    if (BOT_RE.test(ua) || ua.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'bot' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize referrer
    let referrer: string | null = null;
    if (typeof rawReferrer === 'string' && rawReferrer.length > 0 && rawReferrer.length <= 2000) {
      try {
        const u = new URL(rawReferrer);
        if (u.protocol === 'http:' || u.protocol === 'https:') referrer = u.toString().slice(0, 2000);
      } catch { /* invalid URL */ }
    }

    let resolvedUserId: string | null = null;
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) resolvedUserId = user.id;
    }

    // Proxy geo headers (in case Supabase ever forwards them)
    let country = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || null;
    let countryCode = country;
    let city = req.headers.get('cf-ipcity') || req.headers.get('x-vercel-ip-city') || null;
    let region = req.headers.get('cf-region') || req.headers.get('x-vercel-ip-region') || null;
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim() || 'unknown';

    // Fallback IP geolocation when proxy headers are missing.
    if (!country || !city) {
      const geo = await lookupGeo(ip);
      country = country ?? geo.country;
      countryCode = countryCode ?? geo.country_code;
      city = city ?? geo.city;
      region = region ?? geo.region;
    }

    const ip_hash = await hashIp(ip);
    const now = new Date().toISOString();

    // Upsert by session_id
    const { data: existing } = await supabase
      .from('site_visitor_sessions')
      .select('id, page_views, path, country, country_code, city, region')
      .eq('session_id', session_id)
      .maybeSingle();

    if (existing) {
      const samePath = existing.path === (path ?? '/');
      await supabase
        .from('site_visitor_sessions')
        .update({
          last_seen_at: now,
          path: path ?? existing.path,
          page_views: samePath ? (existing.page_views ?? 1) : (existing.page_views ?? 0) + 1,
          user_id: resolvedUserId ?? undefined,
          country: existing.country ?? country,
          country_code: (existing as any).country_code ?? countryCode,
          city: existing.city ?? city,
          region: existing.region ?? region,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('site_visitor_sessions').insert({
        session_id,
        user_id: resolvedUserId,
        path: path ?? '/',
        country, country_code: countryCode, city, region,
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
    console.error('track-visit error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
