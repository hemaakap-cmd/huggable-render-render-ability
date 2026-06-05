# SSRA Academy — Complete Technical Audit Report

**Auditor:** Senior Architect / Security & QA Lead
**Date:** 2 June 2026
**Verdict:** ⛔ NOT PRODUCTION READY — 7 Critical Issues Must Be Fixed First

---

## Executive Summary

SSRA Academy is a well-conceived SaaS platform with a solid architecture:
React 18 + TypeScript + Vite frontend, Supabase backend (PostgreSQL + Auth +
Edge Functions), Stripe payments, and a role-based admin system.

However, the system cannot safely launch in its current state. There are 7
critical issues that either break core functionality entirely, expose revenue
bypass vulnerabilities, or result in silent data loss.

**The most alarming finding:** Any authenticated user can currently INSERT
free enrollments and full CRUD subscriptions directly into the database,
bypassing Stripe entirely. This is not theoretical — it takes 3 lines of
JavaScript in the browser console.

---

## 🚨 CRITICAL ISSUES — Must Fix Before Any Launch

---

### CRITICAL-1: Any Authenticated User Can Give Themselves Free Courses

**Severity:** P0 — Financial Security Breach
**File:** supabase/migrations/20260527100000_ssra_academy_schema.sql

The RLS policies for enrollments and subscriptions use `with check (true)`
and `using (true)` — meaning every logged-in user has unrestricted insert/
update/delete access to the payment tables.

```sql
-- BROKEN: Any user can insert any enrollment
create policy "Service role insert enrollments" on public.ssra_enrollments
  for insert with check (true);  -- TRUE for ALL authenticated users

-- BROKEN: Any user has full CRUD on ALL subscriptions
create policy "Service role manage subscriptions" on public.ssra_subscriptions
  for all using (true);
```

A student can open the browser console and run:
```js
supabase.from("ssra_enrollments").insert({
  user_id: "their-uuid", course_id: "dosb-vorbereitung",
  status: "active", amount_eur: 0
})
// → 201 Created. Free €69 course. No payment needed.
```

**Fix:** Delete these 3 policies. The stripe-webhook edge function uses the
service role key which already bypasses RLS — no policy is needed.

```sql
drop policy "Service role insert enrollments" on public.ssra_enrollments;
drop policy "Service role update enrollments" on public.ssra_enrollments;
drop policy "Service role manage subscriptions" on public.ssra_subscriptions;
```

---

### CRITICAL-2: Foreign Key Type Mismatch — Sessions Table Is Broken

**Severity:** P0 — Feature Completely Non-Functional
**File:** supabase/migrations/20260527130000_ssra_sessions.sql

```sql
-- BROKEN: course_id is UUID but ssra_courses.id is TEXT
course_id uuid references public.ssra_courses(id) on delete cascade,
```

ssra_courses.id is TEXT PRIMARY KEY. ssra_sessions.course_id is UUID.
PostgreSQL rejects foreign keys between incompatible types. This migration
either failed silently or the FK was never created.

**Impact:** Sessions cannot be joined to courses. Every admin-created session
is an orphan. The student Sessions page shows nothing.

**Fix:**
```sql
ALTER TABLE ssra_sessions ALTER COLUMN course_id TYPE text
  USING course_id::text;
```

---

### CRITICAL-3: Column Name Mismatch — Attendance Queries Fail

**Severity:** P0 — Feature Non-Functional
**File:** src/hooks/useSsraData.ts (line 511)

Database column is `attended_at`. The code orders by `joined_at`:

```ts
// WRONG — column doesn't exist
.order("joined_at", { ascending: false });
```

PostgREST returns an error or empty results. Attendance tracking shows no data.

**Fix:** Replace `joined_at` with `attended_at` in useSsraData.ts.

---

### CRITICAL-4: Admin Cannot Change User Roles — Missing RLS Policy

**Severity:** P0 — Admin Feature Non-Functional
**File:** supabase/migrations/20260527100000_ssra_academy_schema.sql

There is NO admin update policy on ssra_profiles. When SuperAdminAdmins.tsx
calls useSetUserRole, the admin updates someone else's row — RLS rejects it.
Role changes silently fail (0 rows updated, no error shown).

**Impact:** The entire "Manage Admins" page is non-functional. No admin can
ever be promoted or demoted.

**Fix:**
```sql
create policy "SuperAdmin update profiles" on public.ssra_profiles
  for update using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  ) with check (true);
```

---

### CRITICAL-5: Stripe Webhook Has No Idempotency

**Severity:** P0 — Stripe Integration Unstable
**File:** supabase/functions/stripe-webhook/index.ts (line 79)

```ts
// INSERT on every webhook delivery — no duplicate protection
const { error } = await supabase.from("ssra_enrollments").insert({...})
if (error) throw new Error(`Enrollment insert failed: ${error.message}`);
```

Stripe retries webhooks for up to 72 hours on non-2xx responses. If the
insert succeeds but the function times out before returning 200, Stripe
retries. The second attempt hits the unique(user_id, course_id) constraint
→ error → Stripe retries again → infinite loop.

**Fix:** Use upsert instead of insert:
```ts
await supabase.from("ssra_enrollments").upsert({
  user_id, course_id, status: "active",
  amount_eur: (session.amount_total ?? 0) / 100,
  stripe_payment_intent: session.payment_intent,
  enrolled_at: new Date().toISOString(),
}, { onConflict: "user_id,course_id" });
```

---

### CRITICAL-6: Anonymous Apply Submissions — Silent Data Loss

**Severity:** P1 — Data Loss
**File:** src/pages/Apply.tsx

The Apply page does not require login. If a user submits without auth:
- user_id = null is passed to the insert
- RLS policy `auth.uid() = user_id` → NULL = NULL → FALSE → insert rejected
- BUT the admin notification email is sent anyway
- The student sees the success screen
- Student thinks they applied. Nothing was saved.

**Fix:** Require login before form submission:
```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  toast({ title: "Please sign in first" });
  navigate(`/login?redirect=/apply`);
  return;
}
```

---

### CRITICAL-7: Stripe Price IDs Fall Back to Invalid Placeholders

**Severity:** P1 — Revenue at Risk
**File:** src/lib/stripe.ts

```ts
priceId: import.meta.env.VITE_STRIPE_PRICE_GERMAN_SUB ?? "price_german_sub",
```

If env vars are not set, "price_german_sub" is sent to Stripe. Stripe rejects
it: "No such price". All 9 payment flows break with a single misconfiguration.
There is no startup validation.

**Fix:** Validate on startup:
```ts
if (import.meta.env.PROD) {
  const required = ["VITE_STRIPE_PUBLISHABLE_KEY", "VITE_STRIPE_PRICE_GERMAN_SUB"];
  required.forEach(k => {
    if (!import.meta.env[k]) throw new Error(`Missing required env: ${k}`);
  });
}
```

---

## 🔴 HIGH PRIORITY ISSUES

**HIGH-1: Checkout Route Not Protected at Router Level**
File: src/App.tsx
`<Route path="/checkout" element={<Checkout />} />` has no RequireAuth wrapper.
Fix: Wrap with RequireAuth.

**HIGH-2: Payment Success Page Is Forgeable**
File: src/pages/PaymentSuccess.tsx
Anyone can visit `/payment-success?courseId=any-course` and see
"Payment Successful!" — no validation against actual payment.
Fix: Validate session_id against Stripe API or DB enrollment status.

**HIGH-3: useSsraAuth Fires Double Profile Fetch on Every Page Load**
File: src/hooks/useSsraAuth.ts
Both getSession() and onAuthStateChange call fetchProfile(). Every page load
runs two parallel Supabase queries causing visible loading flicker.
Fix: Track whether profile has been fetched and skip duplicate calls.

**HIGH-4: Admin Student Enrollment Count Always Shows 0**
File: src/hooks/useSsraData.ts (line 91)
`ssra_enrollments(count)` is invalid PostgREST syntax. Every student shows
0 enrollments in the admin panel.
Fix: Use `ssra_enrollments(*count)` or fetch counts separately.

**HIGH-5: AdminOverview.tsx Is a Dead Orphaned Page (141 lines)**
File: src/pages/ssra-admin/AdminOverview.tsx
Route /ssra-admin/overview exists but is never linked from the sidebar.
Unreachable dead code that duplicates AdminDashboard.
Fix: Delete AdminOverview.tsx and remove its route.

**HIGH-6: Zoom Passwords Stored in Plaintext**
File: ssra_sessions table
zoom_password column stores passwords as plain text. A compromised admin
account exposes all Zoom session passwords.
Fix: Deliver passwords via email before each session instead of storing them.

**HIGH-7: Email Duplicate Check Is Case-Sensitive**
File: src/pages/Apply.tsx
`.eq("email", form.email.trim().toLowerCase())` — stored emails may not be
lowercase, so duplicate detection misses matches.
Fix: Use `.ilike("email", form.email.trim())`.

---

## 🟡 MEDIUM PRIORITY ISSUES

**MED-1: i18next Adds 58KB Bundle Weight for Zero Functionality**
i18n package installed, initialized, but has no translation files and zero
UI usage. Pure dead weight.
Fix: Remove i18next until actual localization is implemented.

**MED-2: Diploma Upload Field Exists in DB but Not in UI**
ssra_verifications.diploma_url column exists. Apply form has no file upload.
Admins must chase students for documents manually via email.
Fix: Add Supabase Storage file upload to the Apply form.

**MED-3: Subscription Fields Never Populated by Webhook**
current_period_start and cancel_at_period_end columns always stay at defaults.
stripe_session_id in enrollments also never written.

**MED-4: Revenue Data Duplicated Across Three Pages**
AdminRevenue.tsx, SuperAdminFinance.tsx, and AdminDashboard.tsx all
independently compute revenue with slightly different queries.
No single source of truth — totals may differ between pages.

**MED-5: Student Cannot Edit Degree or German Level**
MyProfile edit form only exposes full_name and country.
Degree and german_level stored in profile are not editable.

**MED-6: No Rate Limiting on OTP or Application Forms**
Any actor can spam signInWithOtp() with any email or flood the admin inbox
with fake applications.

**MED-7: reviewer_id Never Set in Verification Updates**
ssra_verifications.reviewed_by column exists but useUpdateVerification
mutation never writes the admin's ID to it. No audit trail of who approved.

---

## 🔵 LOW PRIORITY / TECHNICAL DEBT

| # | Issue | Impact |
|---|---|---|
| L-1 | 147 TypeScript `any` usages — no type safety on DB responses | Maintenance risk |
| L-2 | recharts bundle: 434KB raw / 115KB gzip | Performance |
| L-3 | UTM params in sessionStorage — lost on tab-switch or multi-device | Inaccurate attribution |
| L-4 | No retry UI for failed lazy chunk loads | Blank screen on network error |
| L-5 | WhatsAppButton phone number hardcoded | Needs code deploy to change |
| L-6 | QueryClient staleTime: 60s — admin sees 1-minute stale data after mutations | UX |
| L-7 | ResetPassword.tsx exists but system is passwordless — dead page | Confusion |
| L-8 | CORS wildcard on all edge functions | Security hygiene |
| L-9 | ssra_revenue_summary DB view created but never queried | Dead DB object |
| L-10 | send-application-email uses outdated Deno std@0.190.0 API | Inconsistency |

---

## System Integration Map

```
STUDENT FLOW:
Landing → /apply (form) → ssra_verifications [INSERT — BROKEN if not logged in]
                        → send-application-email edge fn → Resend API

Login → OTP → ssra_profiles [auto-created by DB trigger] ✅

/checkout → create-checkout-session edge fn → Stripe Checkout ✅
         → Stripe → /payment-success (unvalidated ❌)
         → Stripe Webhook → stripe-webhook edge fn
              ├─ one_time → ssra_enrollments [UPSERT MISSING ❌]
              └─ subscription → ssra_subscriptions [UPSERT ✅]

ADMIN FLOW:
/ssra-admin → AdminDashboard [reads: profiles, verifications, enrollments] ✅
           ├─ /students → enrollment count BROKEN ❌
           ├─ /verifications → approve/reject works, reviewer_id not saved ⚠️
           ├─ /sessions → FK type mismatch, course joins BROKEN ❌
           ├─ /attendance → column name mismatch, BROKEN ❌
           └─ /admins (super only) → role change BROKEN (missing RLS policy) ❌

DISCONNECTED / INCOMPLETE:
- Session ↔ Course link: Broken (FK type mismatch)
- Diploma upload: Schema exists, no UI
- reviewer_id: Schema column, never populated
- ssra_revenue_summary: DB view exists, never queried
- recording_url: Column exists, no UI for students to view recordings
```

---

## Security Summary

| Risk | Severity | Status |
|---|---|---|
| Free enrollment via RLS bypass | CRITICAL | ❌ Unfixed |
| Admin role change non-functional | HIGH | ❌ Unfixed |
| Webhook without idempotency | HIGH | ❌ Unfixed |
| Payment success page forgeable | HIGH | ❌ Unfixed |
| Anonymous application silent data loss | HIGH | ❌ Unfixed |
| Invalid Stripe price ID fallbacks | HIGH | ❌ Unfixed |
| Zoom passwords in plaintext | MEDIUM | ❌ Unfixed |
| CORS wildcard on payment endpoints | LOW | ❌ Unfixed |
| SQL Injection | N/A | ✅ Protected (PostgREST parameterized) |
| XSS | LOW | ✅ React escapes by default |
| CSRF | N/A | ✅ Supabase JWT protects API calls |
| Secrets in source code | N/A | ✅ All in env vars |
| Stripe secret key in frontend | N/A | ✅ Only in edge function |

---

## Missing Features (Incomplete Implementations)

1. Diploma upload — column in DB, no UI in Apply form
2. Course content delivery — no videos, modules, or LMS features exist
3. Email to student on verification decision — admin approves, student not notified
4. cancel_at_period_end sync from Stripe — never updated
5. Student search by email in admin panel — name only
6. Refund workflow — status exists in schema, no admin UI
7. Session recording access — recording_url column exists, no UI
8. In-app notifications — email only, no in-app alerts
9. Password reset — ResetPassword.tsx is dead (system is passwordless)
10. Bulk actions in admin — no bulk approve/export/delete

---

## Scalability Assessment

| Scale | Verdict | Main Risk |
|---|---|---|
| 100 users | ✅ Fine | No issues |
| 1,000 users | ⚠️ Minor | Double profile fetches, N+1 in admin list |
| 10,000 users | ⚠️ Needs work | All admin lists load everything with no pagination |
| 100,000 users | ❌ Fails | Client-side aggregations fetch MB of data, no caching |

useStudentGrowth() fetches ALL student profiles then groups client-side.
useAdminVerifications("all") fetches all verifications at once.
useAdminEnrollments() fetches all enrollments at once.
None of these have pagination. At 10k+ users, these queries will time out.

---

## Production Readiness Scores

| Category | Score | Reason |
|---|---|---|
| Architecture | 7/10 | Solid foundation, good role system, proper separation |
| Security | 3/10 | Critical RLS bypass allows free enrollment |
| Performance | 6/10 | Good code splitting; client-side aggregations won't scale |
| Code Quality | 6/10 | Clean structure; 147 `any` usages; column mismatches |
| Scalability | 5/10 | No pagination; client-side aggregations; no caching |
| Production Readiness | 3/10 | 7 critical bugs; 3 features completely broken |

---

## Final Action Plan

### Phase 1 — Emergency (Do Before Any User Sees the Site)

```
1. Delete 3 broken RLS policies (free enrollment bypass)
   → Supabase Dashboard → SQL Editor → 15 min

2. Add super-admin write policy on ssra_profiles (role management)
   → Supabase Dashboard → SQL Editor → 10 min

3. Fix ssra_sessions.course_id type: UUID → TEXT (sessions FK)
   → New migration file → 30 min

4. Fix column name: joined_at → attended_at in useSsraData.ts
   → src/hooks/useSsraData.ts line 511 → 5 min

5. Add upsert idempotency to webhook enrollment insert
   → supabase/functions/stripe-webhook/index.ts → 20 min

6. Require auth on Apply page before form submission
   → src/pages/Apply.tsx → 15 min

7. Add env var validation at app startup
   → src/lib/stripe.ts or src/main.tsx → 20 min
```

### Phase 2 — Before First Paying Customer

```
8.  Wrap /checkout route with RequireAuth in App.tsx
9.  Fix AdminStudents enrollment count (PostgREST syntax)
10. Delete AdminOverview.tsx (dead page) and its route
11. Fix useSsraAuth double profile fetch
12. Save reviewer_id in useUpdateVerification mutation
13. Email student when verification is approved or rejected
```

### Phase 3 — Before Public Marketing Launch

```
14. Add diploma file upload to Apply form (Supabase Storage)
15. Add pagination to admin list pages (Students, Verifications, Enrollments)
16. Consolidate revenue data into single shared hook
17. Move chart aggregations from client-side to database queries
18. Remove i18next or implement actual translations (save 58KB)
19. Fix email case-sensitivity in duplicate check (use ilike)
20. Populate stripe_session_id and current_period_start in webhook
```

### Phase 4 — Scale Preparation

```
21. Add course content delivery (videos, PDFs, modules)
22. Materialize ssra_revenue_summary view with caching
23. Add in-app notification system
24. Implement cursor-based pagination on all list queries
25. Add monitoring (Sentry) and alerting
26. Restrict CORS to production domain only
27. Consider encrypting zoom_password at rest
28. Set up automated database backup verification
```

---

**Bottom line:**
The business model is sound and the architecture is well-designed.
But right now there is an open door that lets any registered user give
themselves free access to every course. Fix the 7 critical issues —
most take under 30 minutes each — and you have a launchable product.

Total estimated fix time for Phase 1: ~2 hours.
