import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// EU country codes (ISO-2) — all routed to EUR
const EU_COUNTRIES = new Set([
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
]);

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  EG: "EGP",
  SA: "SAR",
  TN: "TND",
};

type FxCache = { at: number; rates: Record<string, number> };
let fxCache: FxCache | null = null;
const FX_TTL_MS = 6 * 60 * 60 * 1000; // 6h

type GeoCache = { at: number; country: string | null };
const geoCache = new Map<string, GeoCache>();
const GEO_TTL_MS = 6 * 60 * 60 * 1000;

async function getRates(): Promise<Record<string, number>> {
  if (fxCache && Date.now() - fxCache.at < FX_TTL_MS) return fxCache.rates;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error("fx http " + res.status);
    const j = await res.json();
    const rates = j?.rates ?? {};
    if (!rates.EUR) rates.EUR = 1;
    fxCache = { at: Date.now(), rates };
    return rates;
  } catch (e) {
    // Fallback to last cache or a sane default if first call fails
    if (fxCache) return fxCache.rates;
    return { EUR: 1, EGP: 52, SAR: 4, TND: 3.4 };
  }
}

async function lookupCountry(ip: string): Promise<string | null> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip === "::1") return null;
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL_MS) return cached.country;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) { geoCache.set(ip, { at: Date.now(), country: null }); return null; }
    const j = await res.json();
    const cc = j?.success ? (j.country_code ?? null) : null;
    geoCache.set(ip, { at: Date.now(), country: cc });
    return cc;
  } catch {
    return null;
  }
}

function currencyForCountry(cc: string | null): string {
  if (!cc) return "EUR";
  const up = cc.toUpperCase();
  if (COUNTRY_TO_CURRENCY[up]) return COUNTRY_TO_CURRENCY[up];
  if (EU_COUNTRIES.has(up)) return "EUR";
  return "EUR";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const override = url.searchParams.get("country");

    const headerCountry = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || null;
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0].trim();

    let country = (override || headerCountry || null);
    if (!country) country = await lookupCountry(ip);

    const currency = currencyForCountry(country);
    const rates = await getRates();
    const rate = currency === "EUR" ? 1 : (rates[currency] ?? null);

    return new Response(
      JSON.stringify({
        country: country ?? null,
        currency,
        rate: rate ?? 1,
        base: "EUR",
        // expose select rates for client formatting/conversion sanity
        rates: {
          EUR: 1,
          EGP: rates.EGP ?? null,
          SAR: rates.SAR ?? null,
          TND: rates.TND ?? null,
        },
        updatedAt: fxCache?.at ?? Date.now(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=900" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "geo-currency failed", currency: "EUR", rate: 1 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
