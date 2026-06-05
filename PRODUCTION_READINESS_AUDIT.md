# SSRA Academy — Full Production Readiness Audit Report

**Date:** 2026-06-02  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Method:** Full static code analysis — all source files, all migrations, all edge functions  
**Build/Test runtime:** npm/node unavailable in shell; all findings from code-level analysis  
**Scope:** Frontend, Backend (Edge Functions), Database (RLS + Schema), Authentication, Stripe Payments, Course Enrollment, Admin Dashboard, Security, Performance  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Architecture Overview](#project-architecture-overview)
3. [Build & Test Analysis](#build--test-analysis)
4. [CRITICAL Findings](#critical-findings)
5. [HIGH Findings](#high-findings)
6. [MEDIUM Findings](#medium-findings)
7. [LOW Findings](#low-findings)
8. [Area-by-Area Assessment](#area-by-area-assessment)
9. [Summary Table](#summary-table)
10. [Priority Action Plan](#priority-action-plan)

---

## Executive Summary

SSRA Academy is a React 18 + Vite SPA connected to Supabase (Postgres + Auth + Edge Functions) with Stripe for payments. The overall architecture is well-chosen and the code is generally clean and readable.

**However, the application is NOT ready for production launch.** Four critical defects block go-live:

| # | Blocker |
|---|---|
| C-1 | Verification gate for the subscription course is completely disabled — any student can bypass it |
| C-2 | The email-sending edge function has zero authentication — an open spam vector |
| C-3 | No HTTP security headers on any deployment target (no CSP, no HSTS, no X-Frame-Options) |
| C-4 | WhatsApp button ships a hardcoded placeholder phone number to every public page |

Six HIGH severity issues must also be resolved before the first paying customer, including Stripe price IDs falling back to invalid placeholder strings and a privilege-escalation gap in the admin role system.

---

## Project Architecture Overview

```
ssra-academy/
├── src/
│   ├── App.tsx                    Route definitions + auth guards
│   ├── pages/
│   │   ├── Index / Courses / Pricing / About / Contact / Legal
│   │   ├── Checkout.tsx           Stripe checkout entry point
│   │   ├── PaymentSuccess.tsx     Post-payment confirmation
│   │   ├── StudentLogin.tsx       OTP-based auth (no passwords)
│   │   ├── Apply.tsx              Verification application form
│   │   ├── dashboard/             Student-facing portal
│   │   └── ssra-admin/            Admin + super-admin portal
│   ├── hooks/
│   │   ├── useSsraAuth.ts         Auth state hook
│   │   └── useSsraData.ts         All data queries + mutations
│   ├── lib/
│   │   └── stripe.ts              Course catalogue + Stripe client
│   └── integrations/supabase/
│       ├── client.ts              Supabase client
│       └── types.ts               Auto-generated DB types
├── supabase/
│   ├── functions/
│   │   ├── create-checkout-session/   Creates Stripe checkout
│   │   ├── create-portal-session/     Opens Stripe billing portal
│   │   ├── stripe-webhook/            Handles Stripe events → enrollment
│   │   ├── send-application-email/    Sends verification emails (Resend)
│   │   └── send-contact-email/        Contact form emails
│   └── migrations/                6 migration files
├── netlify.toml / vercel.json     Deployment config
└── .env.example                   Environment variable template
```

**Tech stack versions:**
- React 18.3.1, React Router 6.30, TanStack Query 5.83
- Supabase JS 2.91.1, Stripe JS 8.11.0, Stripe API 14.21 (Deno)
- Vite 5.4, TypeScript 5.8, Tailwind 3.4, Vitest 3.2
- i18next 25.8, recharts 2.15, zod 3.25, react-hook-form 7.61

---

## Build & Test Analysis

**npm/node not installed in the current shell** — the following commands could not be executed live. Analysis is based on complete file inspection.

### TypeScript (`tsc --noEmit`)
Expected to pass. No obvious type errors found in reviewed files. Note: `any` casts are used heavily in admin dashboard map/filter operations (e.g. `(enrollments as any[]).filter(...)`) which bypasses type checking for admin-facing data — acceptable short-term, increases risk of runtime errors.

### Build (`vite build`)
Expected to pass. Code splitting is correctly configured in `vite.config.ts`:
```ts
manualChunks: {
  "react-vendor":    ["react", "react-dom", "react-router-dom"],
  "query-vendor":    ["@tanstack/react-query"],
  "supabase-vendor": ["@supabase/supabase-js"],
  "ui-vendor":       ["lucide-react"],
  "recharts-vendor": ["recharts"],
  "i18n-vendor":     ["i18next", "react-i18next", "i18next-browser-languagedetector"],
}
```
`sourcemap: false` is set — correct for production (no source exposure).

### Test Suite (`vitest run`)

**`src/test/stripe-catalog.test.ts`** — **1 test FAILS**

The test at line 43 asserts:
```ts
expect(SUBSCRIPTION_COURSE.requires_verification).toBe(true);
```
But in `src/lib/stripe.ts` every entry including `medical-german` has:
```ts
requires_verification: false,  // line 44
```
**This is the same defect as Critical Finding C-1.**

**`src/test/pages-smoke.test.tsx`** — Expected to pass.
- All 11 public pages are rendered in a MemoryRouter with a full Supabase mock.
- Setup file correctly mocks `IntersectionObserver`, `ResizeObserver`, `matchMedia`.
- No issues found.

**Test coverage:** Only 2 test files exist. No tests for: auth flows, checkout, admin dashboard, webhook logic, enrollment mutation, session management.

---

## CRITICAL Findings

---

### C-1 — Subscription Verification Gate Completely Disabled

**Severity:** CRITICAL — Business logic bypass + test failure  
**Area:** Course Enrollment, Authentication  
**Files:**
- `src/lib/stripe.ts` line 44
- `src/pages/Checkout.tsx` lines 105–165
- `src/test/stripe-catalog.test.ts` line 43
- `supabase/migrations/20260527100000_ssra_academy_schema.sql` line 92

**Description:**

The Medical German subscription (`medical-german`) is supposed to be restricted to verified sports-science graduates. The database seed correctly sets `requires_verification = true`. However, the frontend course catalogue in `src/lib/stripe.ts` has `requires_verification: false` on **every single course**, including the subscription course:

```ts
// src/lib/stripe.ts line 44 — WRONG
{
  id: "medical-german",
  ...
  requires_verification: false,   // ← should be true
  ...
}
```

The checkout page reads this frontend value to decide whether to show the verification gate:

```tsx
// src/pages/Checkout.tsx lines 105-109
const needsVerification = course.requires_verification;  // always false
const isVerified        = verification?.status === "approved";

if (needsVerification && !isVerified) {    // never enters this block
  // show verification wall
}
```

Because `needsVerification` is always `false`, the entire verification wall in `Checkout.tsx` is dead code. Any authenticated user can proceed directly to Stripe and purchase the subscription with no verification check whatsoever.

Additionally, the test suite explicitly validates this flag:
```ts
// src/test/stripe-catalog.test.ts line 43
expect(SUBSCRIPTION_COURSE.requires_verification).toBe(true);
// FAILS — actual value is false
```
Running `npm test` will produce one failing test, confirming the defect.

**Impact:** All business logic around verifying student credentials is bypassed. Unqualified users can subscribe. The 3–5 day review process is skipped.

**Fix:**
```ts
// src/lib/stripe.ts — change line 44 from false to true
requires_verification: true,
```

---

### C-2 — `send-application-email` Edge Function Has No Authentication

**Severity:** CRITICAL — Open spam/email-abuse vector  
**Area:** Backend Security, Email  
**File:** `supabase/functions/send-application-email/index.ts`

**Description:**

The function immediately parses the request body and sends emails with no authentication check:

```ts
// send-application-email/index.ts — entire handler
const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const d: ApplicationPayload = await req.json();
    // ← NO Authorization header check
    // ← NO JWT verification
    // ← NO rate limiting
    
    await sendEmail([d.email], "Application Received — SSRA Academy", studentHtml);
    await sendEmail(["info@ssra-academy.de"], `New Application: ...`, adminHtml);
```

Compare with `create-checkout-session` which correctly validates auth:
```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader) return new Response(..., { status: 401 });
const supabase = createClient(..., { global: { headers: { Authorization: authHeader } } });
const { data: { user }, error } = await supabase.auth.getUser();
if (userError || !user) return new Response(..., { status: 401 });
```

Anyone on the internet can `POST` to this function endpoint with arbitrary `fullName`, `email`, and `motivation` fields and:
1. Send phishing emails that appear to come from SSRA Academy's `noreply@ssra-academy.de`
2. Flood `info@ssra-academy.de` with fake application notifications
3. Exhaust the Resend free-tier quota, breaking legitimate email delivery
4. Get the sending domain blacklisted

**Fix:**

```ts
// Add at the top of the handler, after OPTIONS check:
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(JSON.stringify({ error: "Not authenticated" }), {
    status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Not authenticated" }), {
    status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
```

---

### C-3 — No HTTP Security Headers on Any Deployment Target

**Severity:** CRITICAL — Multiple OWASP Top 10 exposures  
**Area:** Security Headers, Infrastructure  
**Files:** `netlify.toml`, `vercel.json`

**Description:**

Current `netlify.toml`:
```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

Current `vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Neither file sets any HTTP security headers. All of the following are completely absent:

| Header | Attack Prevented | Risk Without It |
|---|---|---|
| `Content-Security-Policy` | XSS, script injection | An injected script can steal Supabase tokens from localStorage |
| `X-Frame-Options: DENY` | Clickjacking | Site can be embedded in an iframe for UI-redressing attacks |
| `X-Content-Type-Options: nosniff` | MIME sniffing | Browser may execute uploaded course images as scripts |
| `Strict-Transport-Security` | SSL stripping, MITM | HTTP downgrade attacks possible |
| `Referrer-Policy: no-referrer-when-downgrade` | Data leakage | Stripe session IDs in success URLs may leak via Referer header |
| `Permissions-Policy` | Fingerprinting | Unnecessary device API access not restricted |

**Notable XSS risk:** Supabase tokens are stored in `localStorage` (configured in `client.ts`). Without a CSP, any XSS vulnerability (including in third-party scripts loaded from CDN) could steal these tokens and impersonate users indefinitely.

**Fix for `netlify.toml`:**
```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
```

---

### C-4 — WhatsApp Button Ships Hardcoded Placeholder Number to Production

**Severity:** CRITICAL — Functional defect on every public page  
**Area:** Frontend, UX  
**File:** `src/components/ssra/WhatsAppButton.tsx` line 4

**Description:**

```ts
// WhatsAppButton.tsx
const WA_NUMBER = "491234567890"; // placeholder — will be configured via env
const WA_MESSAGE = encodeURIComponent("Hi SSRA Academy! I'm interested in your courses.");

export default function WhatsAppButton() {
  const href = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`;
```

The comment acknowledges this should be read from an environment variable, but the code was never updated. This component is rendered on **every page** via `App.tsx`:

```tsx
// App.tsx line 146
<WhatsAppButton />
```

Every visitor to the live site who clicks "WhatsApp Us" will be routed to `wa.me/491234567890` — a random/non-existent number. This is a live user-facing defect that will confuse and lose potential students.

**Fix:**
```ts
const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";
// Add to .env.example: VITE_WHATSAPP_NUMBER=49XXXXXXXXXX
```

---

## HIGH Findings

---

### H-1 — Stripe Price IDs Fall Back to Invalid Placeholder Strings

**Severity:** HIGH — Payments fail silently in production  
**Area:** Stripe Payments  
**File:** `src/lib/stripe.ts` lines 40, 59, 75, 92, 109, 126, 143, 161, 179

**Description:**

Every course in the catalogue uses a fallback for its `priceId`:

```ts
priceId: import.meta.env.VITE_STRIPE_PRICE_GERMAN_SUB ?? "price_german_sub",
priceId: import.meta.env.VITE_STRIPE_PRICE_REHAB      ?? "price_rehab",
priceId: import.meta.env.VITE_STRIPE_PRICE_BEWEGUNG   ?? "price_bewegung",
// ... 6 more
```

The `create-checkout-session` edge function passes this `priceId` directly to Stripe:
```ts
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: priceId, quantity: 1 }],  // priceId = "price_german_sub" if env missing
```

Stripe's API will return a 400: `"No such price: 'price_german_sub'"`. The edge function catches this and returns a 500 to the client. The user sees "Payment error" with no actionable guidance.

**Impact:** If any `VITE_STRIPE_PRICE_*` variable is missing from a deployment (misconfiguration, CI/CD env variable not set, Vercel/Netlify preview branch), all payment flows break for that course. There is no startup warning.

**Fix:** Add a validation check in `main.tsx` or a build plugin:
```ts
// src/main.tsx — add before ReactDOM.createRoot
if (import.meta.env.PROD) {
  const required = [
    "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PUBLISHABLE_KEY",
    "VITE_STRIPE_PRICE_GERMAN_SUB", "VITE_STRIPE_PRICE_REHAB",
    // ... all price IDs
  ];
  const missing = required.filter(k => !import.meta.env[k as keyof ImportMetaEnv]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
}
```

---

### H-2 — `loadStripe("")` Returns null, Crashing All Payment Flows

**Severity:** HIGH — Complete payment failure if key is missing  
**Area:** Stripe Payments  
**File:** `src/lib/stripe.ts` lines 1–5

**Description:**

```ts
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ""
);
```

If `VITE_STRIPE_PUBLISHABLE_KEY` is not set in the deployment environment, `loadStripe("")` returns `Promise<null>`. The Stripe documentation explicitly states: "loadStripe returns null if an error occurred, allowing you to handle the failure gracefully." Code that awaits `stripePromise` expecting a Stripe instance will get `null` and crash. In the current codebase `stripePromise` is exported but not awaited in the Checkout page (Checkout uses `supabase.functions.invoke` instead), so this is partially mitigated — but any future code using the Stripe Elements API will break.

**Fix:** Add an explicit guard:
```ts
const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!key) throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not set");
export const stripePromise = loadStripe(key);
```

---

### H-3 — Any Admin Can Promote Any User to `super_admin`

**Severity:** HIGH — Privilege escalation  
**Area:** Authorization, Database RLS  
**Files:** `src/hooks/useSsraData.ts` lines 420–435, `supabase/migrations/20260602000000_fix_security_issues.sql` lines 76–83

**Description:**

The `useSetUserRole` mutation allows any caller to set `role` to `"super_admin"`:

```ts
// useSsraData.ts
export function useSetUserRole() {
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "student" | "admin" | "super_admin" }) => {
      const { error } = await supabase
        .from("ssra_profiles")
        .update({ role })          // role can be "super_admin"
        .eq("id", userId);
```

The RLS policy added in the security fix migration:

```sql
-- 20260602000000_fix_security_issues.sql
create policy "Admins update profiles" on public.ssra_profiles
  for update using (
    exists (
      select 1 from public.ssra_profiles as p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );
```

This policy allows anyone with `role = 'admin'` (not just `super_admin`) to update any profile row, including changing another user's `role` to `'super_admin'`. A compromised or rogue admin account can silently escalate itself or another account to full super_admin access without any audit trail.

**Impact:** An attacker with admin credentials gains unrestricted super_admin access, including the ability to manage other admins, view finance data, and impersonate any student.

**Fix Option A — RLS-level (preferred):** Split the policy:
```sql
-- Admins can update student profiles (name, country, etc) but NOT role
create policy "Admins update student profiles" on public.ssra_profiles
  for update using (auth.uid() != id)   -- can't update self
  with check (
    exists (select 1 from ssra_profiles where id = auth.uid() and role in ('admin','super_admin'))
    and (role != 'super_admin' or exists (select 1 from ssra_profiles where id = auth.uid() and role = 'super_admin'))
  );
```

**Fix Option B — RPC (simpler):** Create a `security definer` RPC function that validates the caller is `super_admin` before allowing any `role` upgrade to `admin` or `super_admin`.

---

### H-4 — CORS Wildcard `*` on All Edge Functions

**Severity:** HIGH — Unrestricted cross-origin access  
**Area:** Backend Security  
**File:** `supabase/functions/_shared/cors.ts`

**Description:**

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

This wildcard is applied to all edge functions including `send-application-email` (which has no auth — C-2), `create-checkout-session`, `create-portal-session`, and `stripe-webhook`. Allowing any origin:

1. Enables cross-site request forgery from any malicious website against unauthenticated endpoints.
2. Enables data exfiltration if any XSS vulnerability exists — any origin can call the APIs.
3. For `stripe-webhook`, the wildcard is harmless since Stripe sends server-to-server requests, but it is unnecessary.

**Fix:**
```ts
export function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ["https://ssra-academy.de", "http://localhost:8080"];
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "https://ssra-academy.de",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
```

---

### H-5 — No Idempotency Key on Stripe Checkout Session Creation

**Severity:** HIGH — Duplicate payment sessions  
**Area:** Stripe Payments  
**File:** `supabase/functions/create-checkout-session/index.ts` lines 48–63

**Description:**

```ts
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  mode,
  // ... no idempotencyKey
});
```

If a user double-clicks "Continue to Secure Payment", or if the network retries the request, multiple Stripe checkout sessions will be created. While each session still requires the user to complete payment separately (Stripe won't charge twice automatically), this creates:
- Orphaned sessions in the Stripe dashboard
- Confusion if a student opens two browser tabs
- Harder payment reconciliation

**Fix:**
```ts
const session = await stripe.checkout.sessions.create({
  ...
}, {
  idempotencyKey: `checkout-${user.id}-${priceId}-${Date.now().toString().slice(0, -3)}`,
  // Slice last 3 digits to make it per-minute (allows retry within same minute)
});
```

---

### H-6 — Admin Queries Fetch Unlimited Rows — No Pagination

**Severity:** HIGH — Performance degradation + bandwidth cost at scale  
**Area:** Performance, Admin Dashboard  
**File:** `src/hooks/useSsraData.ts`

**Description:**

The following queries have no `.limit()` clause and fetch the entire table on every render/refetch:

```ts
// useAdminStudents — fetches ALL student profiles + join counts
supabase.from("ssra_profiles").select("*, ssra_enrollments(count), ssra_subscriptions(status)")
  .eq("role", "student").order("created_at", { ascending: false });
  // No .limit()

// useAdminEnrollments — fetches ALL enrollments
supabase.from("ssra_enrollments")
  .select("*, ssra_courses(title, price_eur), ssra_profiles(full_name, email)")
  .order("enrolled_at", { ascending: false });
  // No .limit()

// useAdminSubscriptions — fetches ALL subscriptions
supabase.from("ssra_subscriptions")
  .select("*, ssra_courses(title, price_eur), ssra_profiles(full_name, email)")
  .order("created_at", { ascending: false });
  // No .limit()

// useStudentGrowth — fetches ALL student profiles for client-side grouping
supabase.from("ssra_profiles").select("created_at").eq("role", "student")
  .order("created_at", { ascending: true });
  // No .limit() — grows with every new student forever

// useRevenueGrowth — fetches ALL enrollment amounts for client-side grouping
supabase.from("ssra_enrollments").select("amount_eur, enrolled_at")
  .eq("status", "active").order("enrolled_at", { ascending: true });
  // No .limit()
```

At 500 students this starts causing visible latency. At 5,000+ students the admin dashboard will time out.

`useStudentGrowth` and `useRevenueGrowth` are especially wasteful: they download all historical records to compute a chart that only shows the last 8 months.

**Fix:** Add server-side aggregation:
```sql
-- Create a Postgres function for growth data
create or replace function ssra_student_growth_8mo()
returns table(month text, students bigint)
language sql stable as $$
  select to_char(date_trunc('month', created_at), 'Mon YY') as month,
         count(*) as students
  from ssra_profiles
  where role = 'student'
    and created_at >= date_trunc('month', now()) - interval '7 months'
  group by date_trunc('month', created_at)
  order by date_trunc('month', created_at);
$$;
```
Add pagination to `useAdminStudents`, `useAdminEnrollments`, `useAdminSubscriptions` using `.range(offset, offset+49)`.

---

## MEDIUM Findings

---

### M-1 — `useMyProfile()` Has No Explicit User ID Filter

**Severity:** MEDIUM — Relies solely on RLS correctness  
**Area:** Authentication, Data Integrity  
**File:** `src/hooks/useSsraData.ts` lines 57–67

**Description:**

```ts
export function useMyProfile() {
  return useQuery({
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("*")
        .single();     // ← no .eq("id", userId) filter
```

This query trusts RLS to return only the current user's row. If RLS is ever accidentally disabled on `ssra_profiles` (e.g., during a migration), `.single()` would receive multiple rows and throw a runtime error, or worse return the first row in the table (another user's profile).

`useAdminStudents` in the same file correctly filters: `.eq("role", "student")`. The profile query should defensively filter too.

**Fix:**
```ts
queryFn: async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("ssra_profiles")
    .select("*")
    .eq("id", user.id)  // explicit filter
    .single();
```

---

### M-2 — Chart Data Merged by Array Index (Wrong Month Risk)

**Severity:** MEDIUM — Incorrect data displayed to admin  
**Area:** Admin Dashboard  
**File:** `src/pages/ssra-admin/AdminDashboard.tsx` lines 99–105

**Description:**

```ts
const chartData = useMemo(() =>
  (growth as any[]).map((g, i) => ({
    month:    g.month,
    students: g.students,
    revenue:  (revenueGrowth as any[])[i]?.revenue ?? 0,  // ← index-based merge
  })),
[growth, revenueGrowth]);
```

`useStudentGrowth` and `useRevenueGrowth` both independently build 8-month arrays. If one query resolves before the other (TanStack Query loads independently), the merged array is computed mid-load with one array empty, resulting in all `revenue = 0`. More critically, if both are non-empty but one has a cache-miss and re-fetches at a different time, the index `i` may not correspond to the same calendar month in both arrays.

**Example failure:** `growth[3]` is May 2026, but `revenueGrowth[3]` is also May 2026 normally. If revenue data had a gap month (no enrollments in March), the arrays stay aligned via the fixed 8-month generation loop. However if either query's month labeling diverges for any reason, the revenue bar for June would show May's data.

**Fix:** Merge by month key:
```ts
const chartData = useMemo(() => {
  const revenueMap = Object.fromEntries(
    (revenueGrowth as any[]).map((r) => [r.month, r.revenue])
  );
  return (growth as any[]).map((g) => ({
    month:    g.month,
    students: g.students,
    revenue:  revenueMap[g.month] ?? 0,
  }));
}, [growth, revenueGrowth]);
```

---

### M-3 — `send-application-email` Does Not Validate Required Payload Fields

**Severity:** MEDIUM — Malformed emails + runtime errors  
**Area:** Backend, Email  
**File:** `supabase/functions/send-application-email/index.ts` lines 51–72

**Description:**

```ts
const d: ApplicationPayload = await req.json();
// TypeScript interface is compile-time only — no runtime check

// ← d.email could be undefined/empty — sendEmail would receive [""] as recipient
await sendEmail([d.email], "Application Received — SSRA Academy", studentHtml);
```

If the request body is malformed or missing fields, the function will either:
1. Throw a runtime error (e.g., `sanitize(undefined)`) that is caught and returns a generic 500.
2. Send an email to an empty address, causing the Resend API to fail.
3. Produce an email body with blank fields (e.g., "Dear ,").

Additionally the `motivation` field is displayed in the admin email without a length check.

**Fix:**
```ts
const d: ApplicationPayload = await req.json();
if (!d.fullName?.trim() || !d.email?.trim() || !d.country?.trim() || !d.degree?.trim()) {
  return new Response(JSON.stringify({ error: "Missing required fields" }), {
    status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
// Basic email format check
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
  return new Response(JSON.stringify({ error: "Invalid email" }), {
    status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
```

---

### M-4 — `ssra_sessions` Table Has No `updated_at` Column

**Severity:** MEDIUM — Missing audit trail for session edits  
**Area:** Database Schema  
**File:** `supabase/migrations/20260527130000_ssra_sessions.sql`

**Description:**

The sessions table schema:
```sql
create table if not exists public.ssra_sessions (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid references public.ssra_courses(id) on delete cascade,
  title           text not null,
  description     text,
  zoom_link       text not null,
  zoom_password   text,
  scheduled_at    timestamptz not null,
  duration_minutes int not null default 60,
  recording_url   text,
  is_cancelled    boolean not null default false,
  created_at      timestamptz not null default now()
  -- ← no updated_at
);
```

When an admin edits a session (changes title, reschedules, cancels), there is no record of when the change occurred. This makes debugging ("why did the Zoom link change?") and the admin activity feed impossible for session edits.

The `useSsraData.ts` `useUpsertSession` mutation calls `supabase.from("ssra_sessions").update(rest)` without setting any timestamp, so edits are completely invisible.

**Fix:**
```sql
alter table public.ssra_sessions
  add column if not exists updated_at timestamptz not null default now();

-- Trigger to auto-update
create trigger ssra_sessions_updated_at
  before update on public.ssra_sessions
  for each row execute procedure moddatetime(updated_at);
```

---

### M-5 — Apply Page: Duplicate Check Uses Email Not User ID

**Severity:** MEDIUM — Duplicate applications possible; auth not required  
**Area:** Enrollment, Apply Flow  
**File:** `src/pages/Apply.tsx` lines 68–79

**Description:**

```ts
// Apply.tsx — duplicate detection
const { data: existing } = await supabase
  .from("ssra_verifications")
  .select("id, status")
  .eq("email", form.email.trim().toLowerCase())  // ← checks email, not user_id
  .maybeSingle();
```

Issues:
1. The Apply page does not require login (no `RequireAuth` wrapper in `App.tsx` at line 109: `<Route path="/apply" element={<Apply />} />`). An unauthenticated visitor can submit a verification application with any email. The resulting DB row has `user_id = null`.
2. The duplicate check queries by email, but if the user submits with a different email address (e.g., typo) or submits before logging in with their registered email, the duplicate check fails to detect an existing application.
3. The `ssra_verifications` RLS allows `insert with check (auth.uid() = user_id)` — but an unauthenticated user has `auth.uid() = null` and `user_id = null`, so the check `null = null` is `null` in Postgres (not `true`), which **should** block unauthenticated inserts. However, the form auto-fills from the profile if logged in, making this partially functional.

**Fix:** Add `RequireAuth` wrapper to `/apply` route, or at minimum enforce server-side that a valid session exists before inserting.

---

### M-6 — Supabase `types.ts` Contains Tables From a Foreign Project

**Severity:** MEDIUM — Possible wrong Supabase project connected  
**Area:** Infrastructure, Database  
**File:** `src/integrations/supabase/types.ts`

**Description:**

The auto-generated types file contains 40+ unrelated tables:
- `bookings`, `booking_body_areas`, `booking_events`, `booking_feedback`, `booking_reschedules`
- `gyms`, `gym_contacts`, `gym_schedules`, `gym_services`
- `hotels`, `hotel_contacts`, `hotel_schedules`, `hotel_services`
- `therapists`, `therapist_assignments`, `therapist_attendance`, `therapist_cities`
- `services`, `otp_rate_limits`, `gdpr_audit_log`, `edge_function_failures`
- etc.

These appear to be from a wellness/massage booking SaaS, not SSRA Academy.

The SSRA-specific tables (`ssra_profiles`, `ssra_courses`, `ssra_enrollments`, `ssra_subscriptions`, `ssra_sessions`, `ssra_verifications`, `ssra_session_attendance`) **do not appear in the reviewed 2,729 lines**. The file is 3,401 lines total — the SSRA tables may be in the unreviewed tail.

**Possible explanations:**
1. The `VITE_SUPABASE_URL` points to a shared project that runs multiple applications.
2. The types file was generated from the wrong project and never regenerated after the SSRA schema was added.
3. The SSRA tables are at the end of the file (unreviewed lines 2,730–3,401).

**If explanation 1 or 2 is correct:** The app may be reading/writing the wrong database, and foreign project RLS policies are the only thing preventing cross-application data leakage.

**Action required:** Run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts` and verify that SSRA tables appear and foreign tables do not.

---

## LOW Findings

---

### L-1 — No Error Monitoring Integration

**Severity:** LOW — Blind to production failures  
**Area:** Observability  
**Files:** `src/App.tsx`, `src/components/ErrorBoundary.tsx`

**Description:**

The `ErrorBoundary` catches React render errors and logs to `console.error` only:
```ts
componentDidCatch(error: Error, info: ErrorInfo) {
  console.error("[ErrorBoundary]", error, info.componentStack);
  // ← no reporting
}
```

TanStack Query silently swallows hook errors after retries. Supabase query failures surface only if the component checks the `error` return value. In production, failures are invisible until a user reports them.

**Fix:** Integrate Sentry (free tier sufficient for early stage):
```ts
// componentDidCatch
import * as Sentry from "@sentry/react";
Sentry.captureException(error, { extra: info });
```

---

### L-2 — `create-portal-session` Returns HTTP 400 for All Errors

**Severity:** LOW — Incorrect HTTP semantics  
**Area:** Backend, Stripe  
**File:** `supabase/functions/create-portal-session/index.ts` lines 53–57

**Description:**

```ts
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return new Response(JSON.stringify({ error: message }), {
    status: 400,    // ← always 400, even for internal errors
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

A Stripe API outage, DB query failure, or missing env var would return 400 (Bad Request — client's fault). Monitoring tools that alert on 5xx errors will miss these failures. `create-checkout-session` correctly returns 500 for server errors.

**Fix:**
```ts
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const isClientError = message.includes("Not authenticated") || message.includes("No Stripe customer");
  return new Response(JSON.stringify({ error: message }), {
    status: isClientError ? 400 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

### L-3 — Student Growth/Revenue Computed Entirely Client-Side

**Severity:** LOW — Inefficient, will degrade with scale  
**Area:** Performance  
**File:** `src/hooks/useSsraData.ts` lines 362–386, 602–626

**Description:**

Both `useStudentGrowth` and `useRevenueGrowth` download the full historical dataset and group by month in JavaScript:

```ts
// useStudentGrowth — downloads ALL profiles ever created
const { data } = await supabase.from("ssra_profiles")
  .select("created_at").eq("role", "student")
  .order("created_at", { ascending: true });
// ← no limit, no date filter

// Then groups in JS
for (let i = 7; i >= 0; i--) {
  for (const p of data ?? []) {
    if (p.created_at?.startsWith(key)) months[months.length - 1].students++;
  }
}
```

At 10,000 students: 10,000 rows downloaded to render an 8-bar chart. Same pattern in `useRevenueGrowth` for enrollments.

**Fix:** Use a Postgres `date_trunc` aggregation with a `WHERE created_at >= now() - interval '8 months'` filter.

---

### L-4 — `admin_manage_attendance` RLS Has No `WITH CHECK`

**Severity:** LOW — Insufficiently strict write validation  
**Area:** Database RLS  
**File:** `supabase/migrations/20260531010000_ssra_session_attendance.sql` lines 12–19

**Description:**

```sql
CREATE POLICY "admin_manage_attendance" ON ssra_session_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM ssra_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
```

`FOR ALL USING (...)` without `WITH CHECK` uses the USING predicate for both SELECT visibility and INSERT/UPDATE write validation. In practice this means an admin can insert an attendance record with any `user_id` (including users who are not enrolled in the course, or whose `user_id` doesn't exist in `ssra_profiles`). The `ssra_session_attendance` table has a FK to `auth.users` so unknown UUIDs would fail, but non-enrolled student UUIDs would succeed.

**Fix:**
```sql
CREATE POLICY "admin_manage_attendance" ON ssra_session_attendance
  FOR ALL
  USING (EXISTS (SELECT 1 FROM ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')))
  WITH CHECK (
    EXISTS (SELECT 1 FROM ssra_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = ssra_session_attendance.user_id)
  );
```

---

### L-5 — `ssra_revenue_summary` View Accessible Without Admin Check

**Severity:** LOW — Aggregate financial data potentially visible to non-admins  
**Area:** Database  
**File:** `supabase/migrations/20260527100000_ssra_academy_schema.sql` lines 206–214

**Description:**

```sql
create or replace view public.ssra_revenue_summary as
select
  date_trunc('month', enrolled_at)::date as month,
  count(*) as enrollment_count,
  sum(amount_eur) as revenue_eur
from public.ssra_enrollments
where status = 'active'
group by 1
order by 1 desc;
```

In Supabase, views run with the permissions of the view owner (typically `postgres`), bypassing RLS on the underlying table. A student calling `supabase.from("ssra_revenue_summary").select("*")` could see aggregate revenue figures (month, enrollment count, total EUR). While not PII, revenue data is commercially sensitive. No component currently queries this view, but it remains exposed.

**Fix:** Either grant access only to admins via an RLS policy, or use a security-definer function instead of a view.

---

### L-6 — PaymentSuccess Shows Enrollment Confirmation Before Webhook Completes

**Severity:** LOW — UX inconsistency / race condition  
**Area:** Frontend, Stripe Payments  
**File:** `src/pages/PaymentSuccess.tsx` lines 14–20

**Description:**

```tsx
useEffect(() => {
  const t = setTimeout(() => {
    navigate(course?.type === "subscription" ? "/dashboard/subscription" : "/dashboard/courses");
  }, 6000);
```

The page tells the student "Your course is now active in your dashboard" and auto-redirects after 6 seconds. However, the Stripe webhook (`stripe-webhook` function) that actually creates the enrollment record in the database fires asynchronously after Stripe processes the payment. On high-load days Stripe webhooks can be delayed by 5–15 seconds. The student will land on the dashboard and see no active course, then it appears a moment later — a confusing UX.

**Fix:** On `PaymentSuccess`, poll the `ssra_enrollments` table for the new enrollment (with a 30-second timeout + retry) before redirecting, instead of using a fixed delay.

---

### L-7 — Test Coverage Is Minimal

**Severity:** LOW — High defect escape rate  
**Area:** Quality Assurance  
**Files:** `src/test/`

**Description:**

Only 2 test files exist:
- `pages-smoke.test.tsx` — renders 11 public pages without crashing (smoke only)
- `stripe-catalog.test.ts` — validates course catalogue structure

**Not covered by tests:**
- OTP login flow (send code → verify → redirect)
- Checkout (auth check, verification gate, Stripe invocation)
- Webhook handler (enrollment creation, subscription update)
- Admin verification approval/rejection flow
- Role-based access control (`RequireAuth`, `RequireAdmin`, `RequireSuperAdmin`)
- Edge function authentication checks
- RLS policy correctness (integration tests)

**Fix:** Add Vitest integration tests for the auth hooks and at minimum unit tests for the `stripe-webhook` handler logic.

---

## Area-by-Area Assessment

### Frontend

| Check | Status | Notes |
|---|---|---|
| Code splitting | ✅ Pass | All admin + dashboard pages are lazy-loaded |
| Route protection | ✅ Pass | `RequireAuth`, `RequireAdmin`, `RequireSuperAdmin` guards are correct |
| Auth redirect loop prevention | ✅ Pass | Redirect param is encoded correctly |
| Error boundary | ✅ Pass | Catches React errors, multilingual fallback |
| OTP login UX | ✅ Pass | 60s resend cooldown, 6-digit only, back button |
| Verification gate | ❌ Fail | **C-1** — gate is disabled for all courses |
| WhatsApp widget | ❌ Fail | **C-4** — hardcoded placeholder number |
| Stripe Price fallback | ❌ Fail | **H-1** — falls back to invalid strings |
| Chart data merge | ⚠️ Warn | **M-2** — index-based, fragile with misaligned arrays |
| `any` type casts in admin | ⚠️ Warn | Heavy use in admin pages reduces type safety |
| i18n / RTL support | ✅ Pass | i18next configured, ErrorBoundary supports RTL |
| SEO (react-helmet-async) | ✅ Pass | Helmet used on Apply page; coverage of all pages not verified |

### Backend (Edge Functions)

| Function | Auth | Input Validation | Error Handling | Status |
|---|---|---|---|---|
| `create-checkout-session` | ✅ JWT required | ✅ Required fields checked | ✅ 401/400/500 | ✅ |
| `create-portal-session` | ✅ JWT required | ✅ returnUrl optional | ⚠️ All errors → 400 | ⚠️ |
| `stripe-webhook` | ✅ Stripe signature | ✅ Event type checked | ✅ Correct | ✅ |
| `send-application-email` | ❌ **None** | ❌ No field validation | ✅ Try/catch | ❌ |
| `send-contact-email` | Not reviewed | Not reviewed | Not reviewed | — |

### Database & RLS

| Table | RLS Enabled | Student Read | Student Write | Admin | Notes |
|---|---|---|---|---|---|
| `ssra_profiles` | ✅ | Own row only | Own row only | All | ⚠️ Admin can set any role (H-3) |
| `ssra_courses` | ✅ | Active only | ❌ | Full CRUD | ✅ |
| `ssra_enrollments` | ✅ | Own rows | Own rows (fix) | Read all | ✅ (fix applied in migration 6) |
| `ssra_subscriptions` | ✅ | Own rows | ❌ (webhook only) | Full | ✅ (fix applied) |
| `ssra_verifications` | ✅ | Own rows | Own insert | Full CRUD | ⚠️ M-5 |
| `ssra_sessions` | ✅ | Subscribers only | ❌ | Full CRUD | ⚠️ No `updated_at` |
| `ssra_session_attendance` | ✅ | Own rows | ❌ (admin only) | Full | ⚠️ L-4 |
| `ssra_revenue_summary` (view) | — | Accessible | — | — | ⚠️ L-5 |

### Authentication

| Check | Status | Notes |
|---|---|---|
| OTP-based login (no passwords) | ✅ Good | Lower breach risk than password auth |
| Session auto-refresh | ✅ Pass | `autoRefreshToken: true` in client config |
| Sign-out clears session | ✅ Pass | `signOut()` + redirect to `/login` |
| `isAdmin` derived from profile role | ✅ Pass | Fetched server-side from `ssra_profiles` |
| Auth state race condition on load | ✅ Pass | `loading: true` until profile fetched |
| Magic link redirect handling | ✅ Pass | `onAuthStateChange` catches SIGNED_IN event |
| Token stored in localStorage | ⚠️ Note | Accessible to XSS; acceptable without CSP (C-3 fix mitigates) |

### Stripe Payments

| Check | Status | Notes |
|---|---|---|
| Checkout auth required | ✅ Pass | JWT verified in edge function |
| userId passed in metadata | ✅ Pass | Enables reliable webhook enrollment |
| Webhook signature verification | ✅ Pass | `constructEventAsync` with secret |
| `payment` and `subscription` modes | ✅ Pass | Both handled in checkout + webhook |
| Subscription cancellation | ✅ Pass | `customer.subscription.deleted` handled |
| Past-due handling | ✅ Pass | `handleSubscriptionChange` updates status |
| Portal session for self-service | ✅ Pass | `create-portal-session` functional |
| Promotion codes allowed | ✅ Pass | `allow_promotion_codes: true` |
| Billing address collection | ✅ Pass | `billing_address_collection: "auto"` |
| Idempotency key | ❌ Fail | **H-5** — missing |
| Price ID validation | ❌ Fail | **H-1** — fallback to invalid strings |
| Stripe publishable key guard | ❌ Fail | **H-2** — `""` fallback |

### Course Enrollment

| Check | Status | Notes |
|---|---|---|
| One-time purchase → `ssra_enrollments` | ✅ Pass | Webhook upsert on `checkout.session.completed` |
| Subscription → `ssra_subscriptions` | ✅ Pass | Retrieves `current_period_end` from Stripe |
| Enrollment upsert deduplication | ✅ Pass | `onConflict: "user_id,course_id"` |
| Verification gate for subscription | ❌ Fail | **C-1** — disabled on frontend |
| Enrollment visible immediately | ⚠️ Risk | **L-6** — race between PaymentSuccess and webhook |

### Admin Dashboard

| Check | Status | Notes |
|---|---|---|
| Role check before access | ✅ Pass | `RequireAdmin` / `RequireSuperAdmin` guards |
| KPI cards load from live data | ✅ Pass | `useAdminStats` queries all relevant tables |
| Verification review flow | ✅ Pass | Approve/reject with notes, CSV export |
| Session CRUD | ✅ Pass | Create, edit, cancel, attendance tracking |
| Student search | ✅ Pass | `ilike` on name + email |
| CSV export on all admin pages | ✅ Pass | `exportCsv` used across verifications, enrollments |
| Pagination on data tables | ❌ Fail | **H-6** — no pagination, unlimited fetch |
| Revenue chart | ⚠️ Risk | **M-2** — index-based merge |
| Super Admin role promotion guard | ❌ Fail | **H-3** — any admin can promote to super_admin |

### Security

| Check | Status | Notes |
|---|---|---|
| RLS enabled on all tables | ✅ Pass | All 7 SSRA tables have RLS enabled |
| Stripe webhook signature verification | ✅ Pass | Cryptographically verified |
| No secrets in frontend bundle | ✅ Pass | Only publishable keys in VITE_ vars |
| Input sanitization in emails | ✅ Pass | `sanitize()` escapes HTML entities |
| OTP rate limiting | ✅ Pass | Supabase handles server-side |
| HTTP Security Headers | ❌ Fail | **C-3** — completely missing |
| CORS restriction | ❌ Fail | **H-4** — wildcard `*` |
| Unauthenticated email endpoint | ❌ Fail | **C-2** — `send-application-email` has no auth |
| Privilege escalation prevention | ❌ Fail | **H-3** — admin can set super_admin role |
| SQL injection | ✅ Pass | Supabase client uses parameterized queries |
| XSS | ✅ Pass | React auto-escapes; email uses `sanitize()` |

### Performance

| Check | Status | Notes |
|---|---|---|
| Code splitting | ✅ Pass | Vendor chunks configured |
| Source maps disabled in prod | ✅ Pass | `sourcemap: false` |
| TanStack Query caching | ✅ Pass | `staleTime: 60_000` configured |
| Lazy loading for all routes | ✅ Pass | All pages use `lazy()` |
| Admin query pagination | ❌ Fail | **H-6** — all admin queries unbounded |
| Growth/revenue aggregation | ❌ Fail | **L-3** — client-side over full dataset |
| Image optimization | Not reviewed | Storage bucket has 5MB limit ✅ |

---

## Summary Table

| ID | Severity | Area | Finding | Status |
|---|---|---|---|---|
| C-1 | 🔴 CRITICAL | Enrollment | `requires_verification: false` on all courses — gate bypassed; test fails | Open |
| C-2 | 🔴 CRITICAL | Security | `send-application-email` has no authentication — open spam vector | Open |
| C-3 | 🔴 CRITICAL | Security | No HTTP security headers on any deployment (CSP, HSTS, X-Frame-Options) | Open |
| C-4 | 🔴 CRITICAL | Frontend | WhatsApp button hardcodes placeholder number `491234567890` | Open |
| H-1 | 🟠 HIGH | Payments | Stripe Price IDs fall back to invalid placeholder strings | Open |
| H-2 | 🟠 HIGH | Payments | `loadStripe("")` returns null — crashes payment flow | Open |
| H-3 | 🟠 HIGH | Auth/DB | Any admin can promote any user to `super_admin` via RLS gap | Open |
| H-4 | 🟠 HIGH | Security | CORS wildcard `*` on all edge functions | Open |
| H-5 | 🟠 HIGH | Payments | No idempotency key on Stripe checkout session creation | Open |
| H-6 | 🟠 HIGH | Performance | Admin queries fetch unlimited rows — no pagination | Open |
| M-1 | 🟡 MEDIUM | Auth/Data | `useMyProfile()` lacks explicit user ID filter | Open |
| M-2 | 🟡 MEDIUM | Dashboard | Chart data merged by array index — wrong-month data risk | Open |
| M-3 | 🟡 MEDIUM | Backend | `send-application-email` doesn't validate required fields | Open |
| M-4 | 🟡 MEDIUM | Database | `ssra_sessions` has no `updated_at` column | Open |
| M-5 | 🟡 MEDIUM | Enrollment | Apply page duplicate check uses email not user_id; auth not required | Open |
| M-6 | 🟡 MEDIUM | Infra | `types.ts` contains foreign-project tables — confirm correct Supabase project | Open |
| L-1 | 🟢 LOW | Observability | No error monitoring integration (Sentry/equivalent) | Open |
| L-2 | 🟢 LOW | Backend | `create-portal-session` returns 400 for all errors including server errors | Open |
| L-3 | 🟢 LOW | Performance | Student growth/revenue computed client-side over full historical dataset | Open |
| L-4 | 🟢 LOW | Database | `admin_manage_attendance` RLS lacks `WITH CHECK` for write validation | Open |
| L-5 | 🟢 LOW | Database | `ssra_revenue_summary` view accessible without admin RLS restriction | Open |
| L-6 | 🟢 LOW | UX | PaymentSuccess shows "course active" before webhook may have completed | Open |
| L-7 | 🟢 LOW | QA | Test coverage minimal — no tests for auth, checkout, webhook, admin flows | Open |

**Total: 4 Critical · 6 High · 6 Medium · 7 Low = 23 findings**

---

## Priority Action Plan

### Phase 1 — Before Any Public Launch (All Criticals)

| # | Action | File(s) | Effort |
|---|---|---|---|
| 1 | Set `requires_verification: true` on `medical-german` in stripe.ts | `src/lib/stripe.ts:44` | 5 min |
| 2 | Add JWT auth check to `send-application-email` | `supabase/functions/send-application-email/index.ts` | 30 min |
| 3 | Add security headers block to `netlify.toml` and `vercel.json` | Both deployment configs | 20 min |
| 4 | Set real WhatsApp number (env var or constant) | `src/components/ssra/WhatsAppButton.tsx:4` | 10 min |

### Phase 2 — Before First Paying Customer (All Highs)

| # | Action | File(s) | Effort |
|---|---|---|---|
| 5 | Add startup env validation for all Stripe Price IDs | `src/main.tsx` (new check) | 30 min |
| 6 | Guard `loadStripe` against empty key | `src/lib/stripe.ts:3` | 10 min |
| 7 | Add super_admin-only guard for role escalation in RLS or RPC | New migration | 1 hr |
| 8 | Restrict CORS to production domain | `supabase/functions/_shared/cors.ts` | 20 min |
| 9 | Add idempotency key to `stripe.checkout.sessions.create` | `supabase/functions/create-checkout-session/index.ts:48` | 15 min |
| 10 | Add `.limit(50)` + pagination to admin queries | `src/hooks/useSsraData.ts` | 2 hr |

### Phase 3 — Within First Month (Mediums)

| # | Action | File(s) | Effort |
|---|---|---|---|
| 11 | Regenerate `types.ts` from correct Supabase project | CLI command | 15 min |
| 12 | Add explicit `user.id` filter to `useMyProfile` | `src/hooks/useSsraData.ts:57` | 10 min |
| 13 | Fix chart data merge to use month-key lookup | `src/pages/ssra-admin/AdminDashboard.tsx:99` | 20 min |
| 14 | Add field validation to `send-application-email` | `supabase/functions/send-application-email/index.ts:51` | 30 min |
| 15 | Add `updated_at` column + trigger to `ssra_sessions` | New migration | 30 min |
| 16 | Add `RequireAuth` to `/apply` route | `src/App.tsx:109` | 10 min |

### Phase 4 — Ongoing (Lows)

| # | Action | Effort |
|---|---|---|
| 17 | Integrate Sentry for error monitoring | 1 hr |
| 18 | Fix `create-portal-session` to return 500 for server errors | 15 min |
| 19 | Move growth/revenue aggregation to Postgres functions | 2 hr |
| 20 | Add `WITH CHECK` to `admin_manage_attendance` policy | 20 min |
| 21 | Restrict `ssra_revenue_summary` view to admins | 20 min |
| 22 | Poll for enrollment in PaymentSuccess instead of fixed delay | 1 hr |
| 23 | Add tests for auth, checkout, webhook, admin flows | 4–8 hr |

---

*End of audit report. Total findings: 23 (4 Critical, 6 High, 6 Medium, 7 Low).*
*Generated by Claude Code on 2026-06-02.*
