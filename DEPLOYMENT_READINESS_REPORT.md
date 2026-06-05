# SSRA Academy — Deployment Readiness Report
# Environment Variables & Stripe Price ID Audit

**Date:** 2026-06-03
**Method:** Full static code scan — every `import.meta.env.*` and `Deno.env.get()` reference across all source files and edge functions
**Scope:** Frontend (Vite/React), Backend (Supabase Edge Functions), Stripe integration, Deployment configs

---

## Executive Summary

The application uses **14 frontend environment variables** and **6 backend secrets**. Currently:

- **VITE_STRIPE_PRICE_GERMAN_SUB** is the only price ID that matters in production — the other 8 courses are `price_hidden: true` and cannot be purchased through the UI.
- Supabase auto-injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into all edge functions — these do NOT need manual configuration.
- No `.env` file exists in the repository (correct — secrets must be set in the deployment platform only).
- No secrets are exposed in the frontend bundle — only publishable/anon keys appear in `VITE_*` variables.

**The application cannot function without these 4 variables being set correctly in Vercel/Netlify:**
1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_PUBLISHABLE_KEY`
3. `VITE_STRIPE_PUBLISHABLE_KEY`
4. `VITE_STRIPE_PRICE_GERMAN_SUB`

---

## Part 1 — Frontend Environment Variables (Vercel / Netlify)

These are baked into the production bundle at build time. Missing values produce a broken build or silent runtime failure.

### Group A — Supabase Connection

| Variable | File | Fallback | Risk if Missing |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts:5` | None — `undefined` passed to `createClient` | 🔴 **CRITICAL** — All DB queries fail silently. App renders but every data hook returns empty. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts:6` | None — `undefined` passed to `createClient` | 🔴 **CRITICAL** — All auth and DB calls fail. App appears to load but nothing works. |

**Action:** Both must be set in Vercel → Settings → Environment Variables. Values come from **Supabase dashboard → Settings → API → Project URL and anon/public key**.

---

### Group B — Stripe Frontend

| Variable | File | Fallback | Risk if Missing |
|---|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/lib/stripe.ts:4` | `""` → `loadStripe("")` returns `null` | 🔴 **CRITICAL** — Stripe Elements will not load. Any future card UI breaks immediately. Current checkout redirects to Stripe directly so partially mitigated, but any Stripe.js usage crashes. |

**Format:** Must start with `pk_live_` (production) or `pk_test_` (test mode).
**Source:** Stripe Dashboard → Developers → API keys → Publishable key.

---

### Group C — Stripe Price IDs

There are 9 price IDs in the catalogue. **8 of the 9 courses are currently hidden (`price_hidden: true`)** and do not appear on the public pricing page or in the checkout flow. A student cannot purchase a hidden course through the normal UI.

However, the `priceId` for all courses is still compiled into the JavaScript bundle. A user who knows a course ID and navigates directly to `/checkout?courseId=bewegungsanalyse` will trigger a checkout attempt. If the `VITE_STRIPE_PRICE_BEWEGUNG` variable is not set, Stripe receives `"price_bewegung"` and returns a 400 error.

#### Currently Active (publicly visible and purchasable)

| Variable | Course | Price | Type | `price_hidden` | Risk if Missing |
|---|---|---|---|---|---|
| `VITE_STRIPE_PRICE_GERMAN_SUB` | Medizinisches Deutsch | €29/mo | subscription | `false` (visible) | 🔴 **CRITICAL** — The only active product. All subscription payments break. |

#### Currently Hidden (Coming Soon — not publicly purchasable)

These 8 courses show "Coming Soon" on public pages. They cannot be purchased through the normal UI. However they remain reachable via direct URL.

| Variable | Course | Price | Fallback Placeholder | Risk Level |
|---|---|---|---|---|
| `VITE_STRIPE_PRICE_REHAB` | Grundlagen der Sportrehabilitation | €49 | `"price_rehab"` | 🟡 LOW — hidden from UI; Stripe 400 only if direct URL used |
| `VITE_STRIPE_PRICE_BEWEGUNG` | Bewegungsanalyse & Funktionsdiagnostik | €59 | `"price_bewegung"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_PRAXIS` | Sporttherapie in der deutschen Praxis | €79 | `"price_praxis"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_ANATOMIE` | Anatomie für Sport-Reha | €39 | `"price_anatomie"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_TRAINING` | Therapeutisches Training | €55 | `"price_training"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_TELEFON` | Telefonkommunikation im Gesundheitswesen | €29 | `"price_telefon"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_BERUF` | Berufseinstieg & Anerkennung | €49 | `"price_beruf"` | 🟡 LOW — same |
| `VITE_STRIPE_PRICE_DOSB` | DOSB-Lizenz Vorbereitung | €69 | `"price_dosb"` | 🟡 LOW — same |

**Recommendation for hidden courses:** Set each variable to its real Stripe Price ID even if the course is hidden. Cost: ~15 minutes in the Stripe dashboard. Benefit: courses can be unhidden without a new deployment.

---

### Group D — WhatsApp

| Variable | File | Fallback | Risk if Missing |
|---|---|---|---|
| `VITE_WHATSAPP_NUMBER` | `src/components/ssra/WhatsAppButton.tsx:3` | `""` → button renders `null` (hidden) | 🟢 **SAFE** — Button silently disappears. No crash. Set to real number to activate. |

**Format:** International format without `+` or spaces, e.g. `4915123456789`

---

## Part 2 — Backend Secrets (Supabase Edge Functions)

These are set in **Supabase Dashboard → Edge Functions → Secrets** (or `supabase secrets set KEY=value` via CLI). They are never exposed to the browser.

### Group E — Auto-Injected by Supabase (no action required)

These three secrets are automatically available in every edge function. Do not set them manually.

| Secret | Injected By | Used In |
|---|---|---|
| `SUPABASE_URL` | Supabase runtime | All 5 functions |
| `SUPABASE_ANON_KEY` | Supabase runtime | create-checkout-session, create-portal-session, send-application-email, send-verification-status-email |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase runtime | stripe-webhook |

---

### Group F — Must Be Set Manually in Supabase Secrets

| Secret | Used In | Risk if Missing | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | create-checkout-session, create-portal-session, stripe-webhook | 🔴 **CRITICAL** — All Stripe API calls fail. No checkout, no portal, no enrollment. | Must start with `sk_live_` (prod) or `sk_test_` (test). Stripe Dashboard → Developers → API keys → Secret key. |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | 🔴 **CRITICAL** — Webhook silently rejects all events with "Invalid signature". No enrollments created after payment. | Stripe Dashboard → Developers → Webhooks → select your endpoint → Signing secret. |
| `RESEND_API_KEY` | stripe-webhook, send-application-email, send-contact-email, send-verification-status-email | 🟠 **HIGH** — All transactional emails fail silently. Enrollments still created but no notifications sent. | Resend Dashboard → API Keys. The `stripe-webhook` function uses `?? ""` which means email silently fails without crashing enrollment. |

---

## Part 3 — Stripe Product & Price ID Mapping

### Required Stripe Objects

Only one product and price is needed for the current launch (Medical German subscription). The remaining 8 need prices configured when courses become active.

#### For immediate launch (create if not exists)

```
Product: Medizinisches Deutsch (Medical German)
  → Price: €29.00 / month (recurring)
  → Mode: subscription
  → Currency: EUR
  → Env var: VITE_STRIPE_PRICE_GERMAN_SUB
```

#### For future course launches (configure before unhiding)

| Course ID | Product Name | Price | Mode | Env Var |
|---|---|---|---|---|
| sport-rehab-basics | Grundlagen der Sportrehabilitation | €49 one-time | payment | VITE_STRIPE_PRICE_REHAB |
| bewegungsanalyse | Bewegungsanalyse & Funktionsdiagnostik | €59 one-time | payment | VITE_STRIPE_PRICE_BEWEGUNG |
| sporttherapie-praxis | Sporttherapie in der deutschen Praxis | €79 one-time | payment | VITE_STRIPE_PRICE_PRAXIS |
| anatomie-rehab | Anatomie für Sport-Reha | €39 one-time | payment | VITE_STRIPE_PRICE_ANATOMIE |
| therapeutisches-training | Therapeutisches Training | €55 one-time | payment | VITE_STRIPE_PRICE_TRAINING |
| telefonkommunikation | Telefonkommunikation im Gesundheitswesen | €29 one-time | payment | VITE_STRIPE_PRICE_TELEFON |
| berufseinstieg | Berufseinstieg & Anerkennung in Deutschland | €49 one-time | payment | VITE_STRIPE_PRICE_BERUF |
| dosb-vorbereitung | DOSB-Lizenz Vorbereitung | €69 one-time | payment | VITE_STRIPE_PRICE_DOSB |

### Stripe Webhook Configuration

The webhook endpoint must be registered in Stripe to receive events.

**Required endpoint URL:**
```
https://<your-supabase-project>.supabase.co/functions/v1/stripe-webhook
```

**Required events to listen for:**
```
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

**Verification:** After registering the webhook, copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Supabase secrets.

---

## Part 4 — Deployment Config Verification

### Vercel (`vercel.json`) ✅

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [ ... 6 security headers ... ]
}
```
- SPA routing: ✅ configured
- Security headers: ✅ X-Frame-Options, CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options
- Environment variables: ❌ Must be set via Vercel dashboard — not in this file

### Netlify (`netlify.toml`) ✅

```toml
[[redirects]] from="/*" to="/index.html" status=200
[[headers]] for="/*" ... 6 security headers ...
```
- SPA routing: ✅ configured
- Security headers: ✅ identical to Vercel config
- Environment variables: ❌ Must be set via Netlify dashboard — not in this file

---

## Part 5 — Placeholder Price ID Detection

**Scan result:** 8 of 9 price IDs in `src/lib/stripe.ts` still use the `?? "placeholder"` pattern.

```
VITE_STRIPE_PRICE_GERMAN_SUB  ?? "price_german_sub"   ← ACTIVE course
VITE_STRIPE_PRICE_REHAB       ?? "price_rehab"        ← hidden
VITE_STRIPE_PRICE_BEWEGUNG    ?? "price_bewegung"     ← hidden
VITE_STRIPE_PRICE_PRAXIS      ?? "price_praxis"       ← hidden
VITE_STRIPE_PRICE_ANATOMIE    ?? "price_anatomie"     ← hidden
VITE_STRIPE_PRICE_TRAINING    ?? "price_training"     ← hidden
VITE_STRIPE_PRICE_TELEFON     ?? "price_telefon"      ← hidden
VITE_STRIPE_PRICE_BERUF       ?? "price_beruf"        ← hidden
VITE_STRIPE_PRICE_DOSB        ?? "price_dosb"         ← hidden
```

**Verdict:** If `VITE_STRIPE_PRICE_GERMAN_SUB` is correctly set in the deployment platform, the placeholder for the active course is overridden and production payments work. The 8 placeholder values for hidden courses are compiled into the bundle but never reached through the normal UI.

**Remaining risk:** A user who directly navigates to `/checkout?courseId=bewegungsanalyse` would receive a Stripe 400 error with an unhelpful message. This is acceptable while courses are hidden but should be resolved before any course is unhidden.

---

## Part 6 — Deployment Checklist

### Before First Deployment

#### Vercel / Netlify Dashboard — set ALL of these

| # | Variable | Value Source | Priority |
|---|---|---|---|
| 1 | `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | 🔴 Critical |
| 2 | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → anon/public key | 🔴 Critical |
| 3 | `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → Publishable key | 🔴 Critical |
| 4 | `VITE_STRIPE_PRICE_GERMAN_SUB` | Stripe → Products → Medical German → price ID | 🔴 Critical |
| 5 | `VITE_WHATSAPP_NUMBER` | Your WhatsApp Business number | 🟠 High |
| 6–13 | `VITE_STRIPE_PRICE_*` (8 hidden courses) | Stripe → Products → each course → price ID | 🟡 Low (hidden) |

#### Supabase → Edge Functions → Secrets — set ALL of these

| # | Secret | Value Source | Priority |
|---|---|---|---|
| 1 | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key | 🔴 Critical |
| 2 | `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → Signing secret | 🔴 Critical |
| 3 | `RESEND_API_KEY` | Resend → API Keys | 🟠 High |

#### Stripe Dashboard — verify these

| # | Item | How to check |
|---|---|---|
| 1 | Medical German product exists | Products page — name matches |
| 2 | Medical German price is €29/mo recurring | Product → Prices tab |
| 3 | Price ID matches `VITE_STRIPE_PRICE_GERMAN_SUB` | Price ID starts with `price_` |
| 4 | Webhook endpoint registered | Developers → Webhooks |
| 5 | Webhook listens for 3 required events | checkout.session.completed, customer.subscription.updated, customer.subscription.deleted |
| 6 | Webhook signing secret copied to Supabase | Signing secret starts with `whsec_` |
| 7 | Stripe Billing Portal is enabled | Stripe Dashboard → Billing → Customer portal → Activate |

---

## Part 7 — What Cannot Be Verified From Code

The following can only be verified by logging into the respective dashboards. These are the checks that must be completed manually:

| Check | Platform | Status |
|---|---|---|
| `VITE_SUPABASE_URL` is set and points to correct project | Vercel / Netlify | ❓ Cannot verify from code |
| `VITE_SUPABASE_PUBLISHABLE_KEY` matches project | Vercel / Netlify | ❓ Cannot verify from code |
| `VITE_STRIPE_PUBLISHABLE_KEY` is live key (not test) | Vercel / Netlify | ❓ Cannot verify from code |
| `VITE_STRIPE_PRICE_GERMAN_SUB` matches real Stripe price | Vercel / Netlify + Stripe | ❓ Cannot verify from code |
| `STRIPE_SECRET_KEY` is set in Supabase secrets | Supabase | ❓ Cannot verify from code |
| `STRIPE_WEBHOOK_SECRET` is set and matches Stripe | Supabase + Stripe | ❓ Cannot verify from code |
| `RESEND_API_KEY` is valid and domain verified in Resend | Supabase | ❓ Cannot verify from code |
| Resend sending domain `ssra-academy.de` is verified | Resend | ❓ Cannot verify from code |
| Stripe Billing Portal is activated | Stripe | ❓ Cannot verify from code |
| Supabase Auth email templates configured | Supabase | ❓ Cannot verify from code |
| Supabase SMTP or Resend configured for OTP emails | Supabase | ❓ Cannot verify from code |

---

## Summary

| Category | Variables | Confirmed in Code | Needs Dashboard Verification |
|---|---|---|---|
| Frontend — Supabase | 2 | Identified and required | ❓ Must set in Vercel/Netlify |
| Frontend — Stripe (publishable) | 1 | Identified and required | ❓ Must set in Vercel/Netlify |
| Frontend — Stripe (price IDs) | 9 total | 1 active (`medical-german`), 8 hidden | ❓ At minimum `GERMAN_SUB` must be set |
| Frontend — WhatsApp | 1 | Identified — safe fallback (button hides) | ❓ Set to activate button |
| Backend — Stripe secret | 1 | Identified and critical | ❓ Must set in Supabase secrets |
| Backend — Stripe webhook | 1 | Identified and critical | ❓ Must set in Supabase secrets |
| Backend — Resend | 1 | Identified — non-blocking fallback | ❓ Must set in Supabase secrets |
| Backend — Auto-injected | 3 | Auto-provided by Supabase | ✅ No action needed |

**Minimum variables to set for a working launch: 7**
(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_STRIPE_PUBLISHABLE_KEY, VITE_STRIPE_PRICE_GERMAN_SUB, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY)

---

*End of deployment readiness report.*
*Generated 2026-06-03 — static code scan only. Dashboard values must be verified manually.*
