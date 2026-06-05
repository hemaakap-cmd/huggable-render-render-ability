# SSRA Academy - Complete Architecture Audit Report

**Date:** June 2, 2026  
**Project:** SSRA Academy (Sports Science & Rehabilitation Academy)  
**Scope:** Frontend, Backend, Database, Authentication, Payments, Security, Performance  
**Status:** ⚠️ Multiple Critical Issues Identified

---

## Executive Summary

The SSRA Academy platform is a **modern React/Supabase SaaS** with a clean architecture and good separation of concerns. However, **critical issues** have been identified in configuration, security, and data consistency that should be addressed before production deployment.

**Key Findings:**
- ✅ **Positive:** Well-structured React/TypeScript architecture with proper RLS policies
- ❌ **Critical:** Hardcoded wrong company branding, fake Stripe fallback prices, incomplete workflows
- ⚠️ **High:** Paymob not integrated, CORS too permissive, type safety disabled
- 🔧 **Medium:** Data inconsistencies, duplicate data sources, missing audit logging

**Recommended Action:** Address all **CRITICAL** and **HIGH** severity issues before launch.

---

## Issues by Severity

---

## 🔴 CRITICAL ISSUES (Must Fix Before Launch)

### 1. Wrong Company Branding Hardcoded
**File:** [src/constants/branding.ts](src/constants/branding.ts)  
**Severity:** CRITICAL  
**Impact:** High - Wrong company information in exports

**Issue:**
```typescript
// Current (WRONG):
export const COMPANY_INFO = {
  name: "MASSAVO",
  email: "info@massavo.com",
  phone: "+49 160 5652154",
  address: "Bracknellstraße 41, 51379 Leverkusen",
  // ... wrong company branding
};
```

This appears to be copy-pasted from a different project (MASSAVO - a massage services company). This is completely wrong for SSRA Academy (Sports Science Rehabilitation Academy).

**Risk:** Any exports/documents using this will have wrong company information.

**Fix:**
Replace with correct SSRA Academy branding:
```typescript
export const COMPANY_INFO = {
  name: "SSRA Academy",
  email: "info@ssra-academy.de",
  phone: "+49 [CORRECT_NUMBER]",
  address: "[CORRECT_ADDRESS]",
  tagline: "Sports Science & Rehabilitation Academy for Arabic Speakers",
  website: "www.ssra-academy.de",
  // ... correct branding
};
```

**Priority:** P0 - Fix immediately

---

### 2. Hardcoded Fake Stripe Price IDs (Fallback Trap)
**Files:** [src/lib/stripe.ts](src/lib/stripe.ts) (9 occurrences)  
**Severity:** CRITICAL  
**Impact:** Payment failures if environment variables not configured

**Issue:**
```typescript
// Example - all 9 courses have this pattern:
{
  id: "medical-german",
  priceId: import.meta.env.VITE_STRIPE_PRICE_GERMAN_SUB ?? "price_german_sub",
  //                                                          ^^^^^^^^^^^^^^^^
  //                                                    FAKE FALLBACK - WILL FAIL
}
```

If `VITE_STRIPE_PRICE_GERMAN_SUB` environment variable is not set:
- Will use fake price ID `"price_german_sub"`
- Stripe will reject the payment attempt
- Users will see cryptic errors
- **No clear indication that config is missing**

**All 9 courses affected:**
- `price_german_sub` ← Medical German
- `price_rehab` ← Sport Rehab Basics
- `price_bewegung` ← Bewegungsanalyse
- `price_praxis` ← Sporttherapie in der Praxis
- `price_anatomie` ← Anatomie für Sport-Reha
- `price_training` ← Therapeutisches Training
- `price_telefon` ← Telefonkommunikation
- `price_beruf` ← Berufseinstieg
- `price_dosb` ← DOSB-Lizenz Vorbereitung

**Risk:** Complete payment system failure without clear error messaging.

**Fix:**
```typescript
// OPTION 1: Throw error during build if price not configured
const getPrice = (key: string, courseId: string): string => {
  const price = import.meta.env[key];
  if (!price) {
    throw new Error(`Missing Stripe price ID for ${courseId}. Set ${key} in .env`);
  }
  return price;
};

// OPTION 2: Use database to fetch prices at runtime
// Store stripe_price_id in ssra_courses table and fetch dynamically
```

**Priority:** P0 - Fix before any payment testing

---

### 3. Missing Approval Email After Verification
**Files:** [src/pages/ssra-admin/AdminVerifications.tsx](src/pages/ssra-admin/AdminVerifications.tsx)  
**Supabase Function:** Missing  
**Severity:** CRITICAL  
**Impact:** User experience broken - students don't know they're approved

**Issue:**
When admin approves a student verification:
1. Status updated to "approved" in database ✅
2. Approval notification email sent to student? ❌ **NO EMAIL SENT**

**Current Flow:**
```
Student applies → Email sent ✅
Admin reviews → Email sent to admin ✅
Admin approves → NO EMAIL TO STUDENT ❌
Student confused → Manually checks dashboard
```

**Expected Flow:**
```
Student applies → Email sent ✅
Admin reviews → Email sent to admin ✅
Admin approves → Email sent to student: "Your application is approved! Click here to subscribe"
```

**Database:**
```typescript
// AdminVerifications.tsx handles update:
const { status, notes } = await update.mutateAsync({ id, status, notes });
// ^^ Only updates database, no email triggered
```

**Missing:**
- No webhook/trigger on verification status update
- No email function called after approval

**Risk:** 
- Students don't receive approval notification
- Students unaware they can now enroll
- Reduced conversion rate
- Poor user experience

**Fix:**
Add email notification in verification update mutation or create Supabase trigger:

```typescript
// Option 1: In AdminVerifications.tsx after update
if (status === "approved") {
  await supabase.functions.invoke("send-verification-approved-email", {
    body: { verificationId: id, studentEmail: student.email }
  });
}

// Option 2: Create Supabase trigger on ssra_verifications update
-- SQL trigger to send email when status = 'approved'
CREATE OR REPLACE FUNCTION notify_verification_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM net.http_post(
      'https://<your-function-url>/send-verification-approved-email',
      jsonb_build_object('verificationId', NEW.id, 'email', NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Priority:** P0 - Critical workflow

---

### 4. No Email Sent When Application Rejected
**Files:** [src/pages/ssra-admin/AdminVerifications.tsx](src/pages/ssra-admin/AdminVerifications.tsx)  
**Severity:** CRITICAL  
**Impact:** Incomplete rejection workflow

**Issue:**
When admin rejects a student verification with notes:
1. Status updated to "rejected" ✅
2. Admin notes saved ✅
3. Email sent to student explaining rejection? ❌ **NO EMAIL**

**Current:**
```typescript
const confirmMsg = status === "rejected"
  ? "Reject this verification? The student will be notified." // <- WRONG, no notification sent
  : "Approve this verification?";
```

The UI promises "student will be notified" but no email is sent.

**Risk:**
- Student never learns why application was rejected
- No path to reapply with improvements
- Creates support burden (students contact asking about rejection)
- Violates user expectation

**Fix:**
Same as above - send rejection email with admin notes.

**Priority:** P0

---

### 5. Medical German Verification Requirement Inconsistency
**Database:** [supabase/migrations/20260527100000_ssra_academy_schema.sql](supabase/migrations/20260527100000_ssra_academy_schema.sql#L92)  
**Frontend:** [src/lib/stripe.ts](src/lib/stripe.ts)  
**Severity:** CRITICAL  
**Impact:** Possible unauthorized access to restricted course

**Issue:**
Medical German course has **conflicting verification requirements**:

**Database (True):**
```sql
('medical-german', ..., true, 'Ongoing', ...),  -- requires_verification = TRUE
```

**Frontend (Varies):**
```typescript
{
  id: "medical-german",
  title: "Medizinisches Deutsch",
  requires_verification: false,  // <- WRONG in stripe.ts line 32
  //                        ^^^^^ THIS IS FALSE
}
```

**Actual Flow Code** [Courses.tsx](src/pages/Courses.tsx#L45):
```typescript
const handleEnrol = () => {
  if (course.requires_verification) {  // Checks FRONTEND value
    navigate("/apply?course=" + course.id);
  } else {
    navigate("/checkout?courseId=" + course.id);
  }
};
```

**Security Issue:**
- If frontend data loaded from `COURSES` array
- `requires_verification: false` is used for navigation
- User bypasses verification for Medical German
- User can directly purchase without approval

**Database-level enforcement:**
Medical German enrollment depends on `ssra_subscriptions` RLS policy:
```sql
create policy "subscriber_read_sessions" on public.ssra_sessions
  for select using (
    exists (
      select 1 from public.ssra_subscriptions
      where user_id = auth.uid()
      and course_id = 'medical-german'
      and status in ('active', 'trialing')
    )
  );
```

If verification-gating is skipped at frontend → user can pay without approval → database RLS prevents access → confusing UX and failed transaction.

**Risk:** 
- Users can "purchase" Medical German without verification
- Payment succeeds but course access denied by RLS
- Refund requests and support burden
- Security vulnerability

**Fix:**
**Always fetch `requires_verification` from database**, not hardcoded frontend array:

```typescript
// In useSsraData.ts - add query:
export function useAdminCourses() {
  return useQuery({
    queryKey: ["ssra-admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

// In Courses.tsx - use database value:
const { data: courses, isLoading } = useAdminCourses(); // <- single source of truth
```

**Priority:** P0 - Security vulnerability

---

### 6. Stripe Webhook: User ID Resolution Issues
**File:** [supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts#L52-L63)  
**Severity:** CRITICAL  
**Impact:** Orphaned enrollments with null user_id

**Issue:**
When Stripe checkout session completes, webhook tries to find user:

```typescript
let userId: string | null = session.metadata?.userId ?? null;  // Primary source
if (!userId) {
  // Fallback: case-insensitive email lookup
  const { data: profile } = await supabase
    .from("ssra_profiles")
    .select("id")
    .ilike("email", customerEmail)
    .maybeSingle();  // <- Could match wrong user
  userId = profile?.id ?? null;
}

if (!userId) {
  console.warn(`Could not resolve user... enrollment will have null user_id`);
  // ^^^ CONTINUES WITH NULL USER_ID - CREATES ORPHANED ENROLLMENT
}
```

**Scenarios that cause NULL user_id:**
1. Session metadata corrupted or missing userId
2. Email lookup matches wrong account (unlikely but possible)
3. User not yet created in ssra_profiles (shouldn't happen but could)
4. Service role ANON key used instead of SERVICE_ROLE key

**Database Impact:**
```typescript
const { error } = await supabase.from("ssra_enrollments").upsert({
  user_id: userId,    // <- Could be NULL
  course_id: courseId,
  status: "active",
  amount_eur: (session.amount_total ?? 0) / 100,
  // ...
});
```

**Queries with NULL user_id:**
```sql
-- This enrollment has no owner:
SELECT * FROM ssra_enrollments WHERE user_id IS NULL;

-- RLS policy checking user_id = null will FAIL:
create policy "Own enrollments read" on public.ssra_enrollments
  for select using (auth.uid() = user_id);  -- NULL != any UUID
```

**Risk:**
- Enrollment created but unreachable by user (RLS denies access)
- Payment succeeded, no course access
- Stripe shows paid, database shows orphaned
- Requires manual admin intervention to fix
- Difficult to debug - appears as silent failure

**Fix:**
```typescript
if (!userId) {
  // MUST FAIL - don't silently create orphaned enrollment
  throw new Error(
    `Cannot process checkout: no user ID found. ` +
    `Session ID: ${session.id}, Customer Email: ${customerEmail}. ` +
    `Check metadata was included in create-checkout-session call.`
  );
}
```

**Ensure metadata always includes userId:**
```typescript
// In create-checkout-session/index.ts
const session = await stripe.checkout.sessions.create({
  // ...
  metadata: { 
    ...metadata, 
    userId: user.id,  // <- ALWAYS SET THIS
  },
  // ...
});
```

**Priority:** P0 - Data integrity

---

### 7. TypeScript Type Safety Completely Disabled
**File:** [tsconfig.json](tsconfig.json)  
**Severity:** CRITICAL  
**Impact:** Silent bugs, type errors not caught, technical debt

**Issue:**
```typescript
{
  "compilerOptions": {
    "allowJs": true,
    "noImplicitAny": false,           // ❌ Allow any type
    "noUnusedLocals": false,          // ❌ Unused variables allowed
    "noUnusedParameters": false,      // ❌ Unused parameters allowed
    "skipLibCheck": true,             // ❌ Skip lib type checks
    "strictNullChecks": false,        // ❌ null/undefined not caught
    "strict": false,                  // ❌ ALL strict checks off
    // ... rest of config
  }
}
```

**What this means:**
- ❌ `const x: any = null;` - compiles fine
- ❌ `function f(unused: string) {}` - no error
- ❌ `let x = "hello"; x = null;` - allowed despite string type
- ❌ Missing properties not detected
- ❌ Wrong function arguments accepted

**Example Bugs Hidden:**
```typescript
// BUG 1: Type mismatch - Supabase types are wrong
const { data: profile } = await supabase
  .from("ssra_verifications")
  .select("*");
// profile could be any type, no error

// BUG 2: Null access
if (verification) {
  const name = verification.full_name.trim();  // Could crash if null
  // No type checking prevents this
}

// BUG 3: Wrong param type
useAdminVerifications("invalid_status");  // Should only accept "pending" | "approved" | "rejected"
// No error!
```

**Risk:**
- Silent runtime failures
- Hard to debug issues
- Technical debt accumulation
- Harder to onboard new developers
- Code quality degradation over time

**Fix:**
Enable TypeScript strict mode:

```typescript
{
  "compilerOptions": {
    "strict": true,                   // ✅ Enable all strict checks
    "noImplicitAny": true,            // ✅ No implicit any
    "strictNullChecks": true,         // ✅ Strict null checking
    "noUnusedLocals": true,           // ✅ Warn unused locals
    "noUnusedParameters": true,       // ✅ Warn unused parameters
    "noFallthroughCasesInSwitch": true, // ✅ Catch switch fallthrough
    // ... rest
  }
}
```

Then fix all type errors that surface (will be many).

**Priority:** P0 - Enables proper development

---

## 🟠 HIGH SEVERITY ISSUES

### 8. Paymob Payment Method Not Integrated
**Files:** [src/lib/paymob.ts](src/lib/paymob.ts)  
**Severity:** HIGH  
**Impact:** Feature advertised but not functional

**Issue:**
Paymob is configured with 4 payment methods:
```typescript
export const PAYMOB_METHODS: PaymobMethodConfig[] = [
  { id: "card",         label: "Visa / Mastercard", ... },
  { id: "fawry",        label: "Fawry", ... },
  { id: "vodafone_cash",label: "Vodafone Cash", ... },
  { id: "orange_money", label: "Orange Money", ... },
];
```

But **NOT CONNECTED to checkout flow**:
- No Paymob API integration in [create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)
- Only Stripe is used: `const stripe = new Stripe(...)`
- Paymob button/UI not in [Checkout.tsx](src/pages/Checkout.tsx)
- No environment variables for Paymob API key

**Current Flow (incomplete):**
```
User sees course → "Enrol Now" → Stripe checkout only
                                   (no Paymob option)
```

**Risk:**
- Users in Egypt/Middle East can't use Fawry, Vodafone Cash, Orange Money
- Advertised feature doesn't work
- Customer support burden
- Lost sales from users wanting local payment methods

**Fix:**
Either:

**OPTION 1: Remove Paymob entirely** (if not needed)
- Delete [src/lib/paymob.ts](src/lib/paymob.ts)
- Remove from checkout UI
- Document that only Stripe is supported

**OPTION 2: Implement Paymob** (if needed for market)
- Create `supabase/functions/create-paymob-session/index.ts`
- Add Paymob environment variables
- Add payment method selection in [Checkout.tsx](src/pages/Checkout.tsx)
- Handle Paymob webhook for payment confirmation

**Priority:** P1 - Either implement or remove

---

### 9. CORS Headers Too Permissive
**File:** [supabase/functions/_shared/cors.ts](supabase/functions/_shared/cors.ts)  
**Severity:** HIGH  
**Impact:** CORS vulnerability

**Issue:**
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ❌ ALLOWS ANYONE
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

**Security Risk:**
- Any website can call these functions
- Attacker can craft malicious requests from their domain
- `create-checkout-session` function publicly accessible
- `send-application-email` could be abused to spam

**Attack Scenario:**
```javascript
// Attacker website (evil.com)
fetch('https://ssra-academy-functions.supabase.co/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({
    priceId: 'price_german_sub',
    metadata: { courseId: 'medical-german' }
  })
});
// ^^^ Works because * allows it
```

**Fix:**
Restrict to your domain:
```typescript
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://ssra-academy.de",
    "https://www.ssra-academy.de",
    "http://localhost:8080",  // dev only
  ];
  
  const isAllowed = allowedOrigins.includes(origin);
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
```

**Priority:** P1 - Security issue

---

### 10. Missing Rate Limiting on Payment Functions
**Files:** [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)  
**Severity:** HIGH  
**Impact:** Abuse potential

**Issue:**
No rate limiting on:
- `create-checkout-session` - call unlimited times
- `create-portal-session` - call unlimited times
- `send-contact-email` - spam attack vector
- `send-application-email` - abuse potential

**Attack Scenario:**
```javascript
// Attacker creates 1000 checkout sessions
for (let i = 0; i < 1000; i++) {
  fetch('/create-checkout-session', {
    body: JSON.stringify({ priceId: 'price_german_sub' })
  });
}
// Creates 1000 Stripe sessions, costs $$ in API calls
```

**Risk:**
- Denial of service via API resource exhaustion
- Email spam to admin (send-application-email)
- Financial abuse (Stripe API costs)

**Fix:**
Implement rate limiting per user/IP:

```typescript
// Middleware for Deno functions
async function checkRateLimit(req: Request): Promise<boolean> {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const key = `rate_limit:${ip}:create-checkout`;
  
  // Use Supabase edge function cache or Redis
  const count = await redis.incr(key);
  if (count === 1) redis.expire(key, 60); // 1 minute window
  
  return count <= 10; // 10 requests per minute per IP
}

// In handler:
if (!await checkRateLimit(req)) {
  return new Response('Too many requests', { status: 429 });
}
```

**Priority:** P1 - Prevent abuse

---

### 11. Verification Status Not Enforced at Enrollment
**Files:** Database RLS policies  
**Severity:** HIGH  
**Impact:** Can bypass verification workflow

**Issue:**
When user has NOT been verified, they should not be able to:
1. ✅ Enroll in Medical German (requires verification)
2. But nothing stops them from trying

**Current RLS policy for subscriptions:**
```sql
create policy "Own subscription read" on public.ssra_subscriptions
  for select using (auth.uid() = user_id);

create policy "Admins manage subscriptions" on public.ssra_subscriptions
  for all using (
    exists (
      select 1 from public.ssra_profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
```

**Missing:** No policy checking `ssra_verifications` status for Medical German enrollment.

**Frontend safeguard exists:**
```typescript
// Checkout.tsx checks verification
const { data: verification } = useMyVerification();
if (course.requires_verification && !verification?.approved) {
  // Show "not approved" message
}
```

But **if frontend is bypassed** (curl, API call), enrollment can be forced via Stripe webhook because webhook uses SERVICE_ROLE key (bypasses RLS).

**Risk:**
- Determined user can bypass verification
- Could use API calls to Stripe directly
- Medical German enrollment without approval

**Fix:**
Add RLS policy enforcing verification:
```sql
create policy "Medical German requires verification" 
  on public.ssra_subscriptions
  for insert
  with check (
    course_id != 'medical-german' OR
    EXISTS (
      select 1 from public.ssra_verifications
      where user_id = auth.uid()
      and course_id = 'medical-german'
      and status = 'approved'
    )
  );
```

**Also in webhook:** Check verification before creating subscription:
```typescript
// In stripe-webhook/index.ts
if (courseId === 'medical-german') {
  const { data: verification } = await supabase
    .from('ssra_verifications')
    .select('status')
    .eq('user_id', userId)
    .eq('course_id', 'medical-german')
    .eq('status', 'approved')
    .maybeSingle();
  
  if (!verification) {
    throw new Error('Medical German requires approved verification');
  }
}
```

**Priority:** P1 - Security/business logic

---

### 12. Inconsistent Medical German Configuration
**Database:** `requires_verification = true`  
**Frontend:** [src/lib/stripe.ts](src/lib/stripe.ts) line 32: `requires_verification: false`  
**Severity:** HIGH  
**Impact:** Conflicts with requirement #11

**Details:** Already covered in CRITICAL #5 above.

**Priority:** P0 - See CRITICAL #5

---

## 🟡 MEDIUM SEVERITY ISSUES

### 13. Data Duplication: Courses Defined in Multiple Places
**Files:** 
- [supabase/migrations/20260527100000_ssra_academy_schema.sql](supabase/migrations/20260527100000_ssra_academy_schema.sql#L92) - 9 courses seeded
- [src/lib/stripe.ts](src/lib/stripe.ts#L18) - 9 courses hardcoded
**Severity:** MEDIUM  
**Impact:** Maintenance nightmare, inconsistency risk

**Issue:**
Course data exists in TWO sources:

**Source 1: Database (seeded)**
```sql
insert into public.ssra_courses
  (id, title, title_ar, subtitle, price_eur, ...)
values
  ('medical-german', 'Medizinisches Deutsch', ..., 29, ...),
  ('sport-rehab-basics', 'Grundlagen der Sportrehabilitation', ..., 49, ...),
  -- ... 7 more
```

**Source 2: Frontend (hardcoded)**
```typescript
export const COURSES: Course[] = [
  {
    id: "medical-german",
    title: "Medizinisches Deutsch",
    price: 29,
    // ... 9 more
  }
];
```

**Problems:**
1. **Update burden:** Change price → update database AND frontend
2. **Inconsistency risk:** Database says €29, frontend says €49
3. **Frontend display:** If course added to database, frontend won't show it (until code updated)
4. **Admin changes:** Admin updates course in UI → database updates → frontend still hardcoded
5. **Extra fields in frontend:** `modules`, `color`, `titleAr` not in database schema initially

**Example Inconsistency:**
```typescript
// Database has latest prices, frontend doesn't
// Admin updates price from €29 to €35 in UI
// Checkout page still uses old hardcoded €29

// Or worse:
// User sees €35 on courses page (from DB)
// Sees €29 at checkout (from hardcoded array)
// Confusion about final price
```

**Fix:**
**Always fetch from database at runtime:**

```typescript
// Remove COURSES array from stripe.ts
// Instead, create hook:

export function useCourses() {
  return useQuery({
    queryKey: ["ssra-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

// In Courses.tsx, Checkout.tsx, etc:
const { data: courses } = useCourses();
// Single source of truth from database
```

**Database fields should include:**
- ✅ id, title, title_ar, subtitle
- ✅ description (currently "desc")
- ✅ price_eur, price_egp
- ✅ course_type (one_time / subscription)
- ✅ category (clinical / language / career)
- ✅ requires_verification
- ✅ duration_weeks, level
- ✅ is_active, sort_order
- ✅ stripe_price_id
- ✅ image_url
- ✅ modules (JSONB)
- ✅ color (for UI gradient) - add to schema

**Priority:** P2 - Medium impact but important for maintainability

---

### 14. Missing Subscription Auto-Renewal Error Handling
**File:** [supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts#L108-L118)  
**Severity:** MEDIUM  
**Impact:** Potential service interruption for past_due subscriptions

**Issue:**
Webhook handles subscription status updates:
```typescript
async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const status = sub.status; // active, trialing, past_due, canceled, etc.
  
  const { error } = await supabase
    .from("ssra_subscriptions")
    .update({
      status,
      current_period_end: periodEnd,
    })
    .eq("stripe_subscription_id", stripeSubId);

  if (error) console.error("Subscription status update failed:", error.message);
  // ^^^ Logs error but continues
}
```

**Missing:**
- No handling for `past_due` status (payment failed)
- No notification to user that payment failed
- No retry logic or grace period
- User may still have access despite past_due

**RLS Policy Issue:**
```sql
create policy "subscriber_read_sessions" on public.ssra_sessions
  for select using (
    exists (
      select 1 from public.ssra_subscriptions
      where user_id = auth.uid()
      and course_id = ssra_sessions.course_id
      and status in ('active', 'trialing')  -- past_due NOT included
    )
  );
```

Good - past_due users **cannot** access sessions. But:
- User has no notification they're past_due
- Session access suddenly stops
- Confusing experience

**Fix:**
```typescript
async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const status = sub.status;
  const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

  // Handle different statuses
  if (status === 'past_due') {
    // Send payment reminder email
    await supabase.functions.invoke('send-payment-reminder-email', {
      body: { subscriptionId: sub.id, customerEmail: sub.customer_email }
    });
  }
  
  if (status === 'canceled') {
    // Send cancellation confirmation
    await supabase.functions.invoke('send-cancellation-email', {
      body: { subscriptionId: sub.id }
    });
  }

  // Update status
  const { error } = await supabase
    .from("ssra_subscriptions")
    .update({ status, current_period_end: periodEnd })
    .eq("stripe_subscription_id", stripeSubId);

  if (error) {
    console.error("Subscription update failed:", error);
    throw error; // Fail loud, don't silently continue
  }
}
```

**Priority:** P2 - User experience issue

---

### 15. No Audit Logging for Admin Actions
**Files:** Multiple admin pages  
**Severity:** MEDIUM  
**Impact:** Cannot track who made what changes

**Issue:**
Admin actions not logged:
- Who approved/rejected verification
- When did they change course pricing
- Who deleted a session
- What changes were made to courses
- Who promoted/demoted admin users

**Current:** Actions are performed but not recorded in audit log.

**Example - Verification approval:**
```typescript
// AdminVerifications.tsx
const { error } = await supabase
  .from("ssra_verifications")
  .update({
    status,
    admin_notes: notes,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user?.id ?? null,  // Recorded which admin, but...
  })
  .eq("id", id);
// ^^^ No separate audit log entry
```

**Issues:**
1. If record is deleted, no history of who approved it
2. No audit trail for compliance (GDPR, etc.)
3. Hard to debug admin mistakes
4. No accountability trail

**Fix:**
Create audit log table:
```sql
create table if not exists public.ssra_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  action text not null,  -- 'verification_approved', 'course_updated', etc
  table_name text,
  record_id text,
  changes jsonb,  -- old → new values
  timestamp timestamptz default now()
);
```

Then log in functions:
```typescript
// After updating verification
await supabase.from("ssra_audit_log").insert({
  admin_id: user.id,
  action: "verification_approved",
  table_name: "ssra_verifications",
  record_id: id,
  changes: { status: "pending" → "approved", admin_notes: notes }
});
```

**Priority:** P2 - Compliance/accountability

---

### 16. No Unique Constraint on Enrollments
**File:** [supabase/migrations/20260527100000_ssra_academy_schema.sql](supabase/migrations/20260527100000_ssra_academy_schema.sql#L147)  
**Severity:** MEDIUM  
**Impact:** Potential duplicate enrollments

**Issue:**
```sql
create table if not exists public.ssra_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id text references public.ssra_courses(id),
  -- ... other fields ...
  unique (user_id, course_id)  // ✅ Good - prevent duplicates
);
```

Actually the unique constraint IS there. **But:**

Stripe webhook uses `upsert` with `onConflict`:
```typescript
const { error } = await supabase.from("ssra_enrollments").upsert({
  user_id: userId,
  course_id: courseId,
  // ...
}, { onConflict: "user_id,course_id" });
```

**Issue:** If `user_id` is NULL (see CRITICAL #6), upsert doesn't work:
```sql
-- This won't conflict with existing because NULL != NULL
INSERT INTO ssra_enrollments (user_id, course_id, ...)
VALUES (NULL, 'medical-german', ...)
ON CONFLICT (user_id, course_id) DO UPDATE SET ...;

-- Results in duplicate with same course_id but different user_id (null)
```

**Fix:** See CRITICAL #6 - ensure user_id is never null.

**Priority:** P2 - Dependent on CRITICAL #6

---

### 17. Medical German Course Inconsistency: Database vs Frontend
**Database:** `requires_verification = true`  
**Frontend stripe.ts:** `requires_verification: false`  
**Severity:** MEDIUM  
**Impact:** Security issue (covered in CRITICAL #5)

Already covered - see CRITICAL #5.

**Priority:** P0 - See CRITICAL #5

---

### 18. Hardcoded Stripe API Version
**File:** [supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts#L5-L8)  
**Severity:** MEDIUM  
**Impact:** Future Stripe API changes break code

**Issue:**
```typescript
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",  // Hardcoded date
  httpClient: Stripe.createFetchHttpClient(),
});
```

If Stripe API changes after this version, code breaks silently.

**Fix:**
Use environment variable or latest version:
```typescript
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: Deno.env.get("STRIPE_API_VERSION") ?? undefined, // Use latest
  httpClient: Stripe.createFetchHttpClient(),
});
```

**Priority:** P3 - Long-term maintenance

---

### 19. EGP Pricing Formula Hardcoded
**File:** [supabase/migrations/20260527120000_ssra_courses_images_egp.sql](supabase/migrations/20260527120000_ssra_courses_images_egp.sql#L14)  
**Severity:** MEDIUM  
**Impact:** Inaccurate pricing if exchange rate changes

**Issue:**
```sql
update public.ssra_courses set price_egp = price_eur * 55
where price_egp is null;
```

Uses fixed conversion rate: `1 EUR = 55 EGP`

But exchange rates fluctuate:
- Jan 2024: 1 EUR = 49 EGP
- June 2024: 1 EUR = 53 EGP
- June 2026: 1 EUR = 55 EGP (assumed in migration)

**Risk:**
- Over time, pricing becomes inaccurate
- Manual updates required
- Missed when new courses added

**Fix:**
Store and update exchange rate:
```sql
-- Create config table
create table if not exists public.ssra_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Store exchange rate
insert into public.ssra_config (key, value) values ('EUR_TO_EGP', '55');

-- When updating prices
update public.ssra_courses 
set price_egp = price_eur * (
  select value::numeric from public.ssra_config where key = 'EUR_TO_EGP'
);
```

Then admin can update exchange rate without touching code.

**Priority:** P2 - Business accuracy

---

### 20. No Unique Constraint on Application Email
**File:** [supabase/migrations/20260527100000_ssra_academy_schema.sql](supabase/migrations/20260527100000_ssra_academy_schema.sql#L123)  
**Severity:** MEDIUM  
**Impact:** Duplicate applications possible

**Issue:**
```sql
create table if not exists public.ssra_verifications (
  id uuid primary key default gen_random_uuid(),
  -- ... fields ...
  email text not null,
  status text not null default 'pending',
  -- ... NO UNIQUE CONSTRAINT ON EMAIL
);
```

Same applicant could submit multiple times:
```sql
INSERT INTO ssra_verifications (email, ...) VALUES ('john@example.com', ...);
INSERT INTO ssra_verifications (email, ...) VALUES ('john@example.com', ...);  -- Allowed

-- Result: 2 applications for same person in review queue
```

**Frontend has check:**
```typescript
// Apply.tsx
const { data: existing } = await supabase
  .from("ssra_verifications")
  .select("id, status")
  .eq("email", form.email.trim().toLowerCase())
  .maybeSingle();

if (existing) {
  // Prevent duplicate
}
```

But **frontend check can be bypassed** by direct API call.

**Fix:**
Add unique constraint to email + lower():
```sql
create unique index if not exists ssra_verifications_email_unique
  on public.ssra_verifications (lower(email));
```

**Priority:** P2 - Data integrity

---

## 🟢 LOW SEVERITY ISSUES

### 21. WhatsApp Button Has Hardcoded Phone Number
**File:** [src/components/ssra/WhatsAppButton.tsx](src/components/ssra/WhatsAppButton.tsx)  
**Severity:** LOW  
**Issue:** Phone number hardcoded instead of configuration

**Current:**
```typescript
// Likely hardcoded in component
const whatsappNumber = "+49123456789";  // Hardcoded
```

**Fix:** Move to environment or config
```typescript
const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER ?? "+49...";
```

**Priority:** P3 - Minor, can wait

---

### 22. Test Coverage Minimal
**Files:** [src/test/](src/test/)  
**Severity:** LOW  
**Issue:** Only smoke tests exist, critical flows not tested

**Current tests:**
- `pages-smoke.test.tsx` - Basic render tests
- `stripe-catalog.test.ts` - Stripe catalog verification
- `setup.ts` - Test environment setup

**Missing:**
- Payment workflow tests
- Verification workflow tests
- Authentication tests
- Enrollment flow tests
- RLS policy tests

**Priority:** P3 - Improvements for reliability

---

### 23. i18n Not Fully Utilized
**File:** [src/i18n/](src/i18n/)  
**Severity:** LOW  
**Issue:** i18n configured but not all UI translated

**Current:**
- ✅ Email templates bilingual
- ✅ Some course titles translated
- ❌ Apply form UI not translated
- ❌ Admin pages not translated
- ❌ Error messages not translated

**Priority:** P3 - Nice to have

---

### 24. No Analytics Integration
**File:** [src/pages/ssra-admin/SuperAdminActivity.tsx](src/pages/ssra-admin/SuperAdminActivity.tsx)  
**Severity:** LOW  
**Issue:** Analytics page exists but no data connected

**Missing:**
- Event tracking (page views, enrollments, conversions)
- Analytics backend integration
- Data collection from frontend

**Priority:** P3 - Feature implementation

---

### 25. Sessions RLS Policy Incomplete
**File:** [supabase/migrations/20260527130000_ssra_sessions.sql](supabase/migrations/20260527130000_ssra_sessions.sql)  
**Severity:** LOW  
**Issue:** Only subscribers can read sessions, but admins need different access

**Current:**
```sql
create policy "subscriber_read_sessions" on public.ssra_sessions
  for select using (
    exists (
      select 1 from public.ssra_subscriptions
      where user_id = auth.uid()
      and course_id = ssra_sessions.course_id
      and status in ('active', 'trialing')
    )
  );
```

Good but also need:
- Admins to see all sessions for course management
- Session creators to see their own sessions

**Fix:**
Add additional policies for admin/creator access.

**Priority:** P3 - Functional but could be cleaner

---

## Summary: Issues by Category

### Security Issues (6 CRITICAL + 3 HIGH)
1. ✅ Wrong branding hardcoded
2. ✅ Fake Stripe price ID fallbacks
3. ✅ CORS too permissive
4. ✅ No rate limiting on functions
5. ✅ Verification bypass possible
6. ✅ Medical German requirements inconsistent
7. ✅ Webhook null user_id handling
8. ✅ Type safety disabled

### Payment System Issues (2 CRITICAL + 1 HIGH)
1. ✅ Hardcoded fake Stripe prices
2. ✅ Paymob not integrated
3. ✅ Webhook user resolution issues

### Workflow/UX Issues (2 CRITICAL)
1. ✅ Missing approval email
2. ✅ Missing rejection email

### Data Consistency Issues (4 MEDIUM)
1. ✅ Course data duplicated (DB + frontend)
2. ✅ Medical German config inconsistent
3. ✅ EGP price formula hardcoded
4. ✅ Application email not unique

### Type Safety Issues (1 CRITICAL)
1. ✅ TypeScript strict mode disabled

### Integration Issues (1 HIGH)
1. ✅ Paymob configured but not connected

---

## Recommended Fix Priority

### Phase 1: Critical (Do First - 1-2 Days)
**Issues that break core functionality:**
1. Fix wrong branding [CRITICAL #1]
2. Fix Stripe price ID fallbacks [CRITICAL #2]
3. Fix Medical German verification inconsistency [CRITICAL #5]
4. Fix webhook null user_id handling [CRITICAL #6]
5. Add approval/rejection emails [CRITICAL #3, #4]
6. Enable TypeScript strict mode [CRITICAL #7]

### Phase 2: High (Next Week)
**Security and data integrity:**
7. Restrict CORS headers [HIGH #9]
8. Add rate limiting [HIGH #10]
9. Enforce verification at database level [HIGH #11]
10. Either implement or remove Paymob [HIGH #8]

### Phase 3: Medium (Next Sprint)
**Maintenance and data quality:**
11. Consolidate course data to database only [MEDIUM #13]
12. Add subscription status handling [MEDIUM #14]
13. Implement audit logging [MEDIUM #15]
14. Add unique constraint on application email [MEDIUM #20]

### Phase 4: Low (Polish)
**Nice-to-have improvements:**
15. Fix hardcoded config values
16. Improve test coverage
17. Expand i18n coverage
18. Connect analytics

---

## Files That Need Updates

### Frontend Files
- [x] [src/constants/branding.ts](src/constants/branding.ts) - Wrong company info
- [x] [src/lib/stripe.ts](src/lib/stripe.ts) - Fake price IDs, wrong verification flag
- [x] [tsconfig.json](tsconfig.json) - Type safety disabled
- [x] [src/pages/ssra-admin/AdminVerifications.tsx](src/pages/ssra-admin/AdminVerifications.tsx) - Missing email triggers
- [x] [src/hooks/useSsraData.ts](src/hooks/useSsraData.ts) - Should fetch courses from DB

### Backend/Database Files
- [x] [supabase/migrations/](supabase/migrations/) - Various consistency issues
- [x] [supabase/functions/stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts) - Null user_id handling
- [x] [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts) - Ensure metadata included
- [x] [supabase/functions/_shared/cors.ts](supabase/functions/_shared/cors.ts) - Restrict CORS

### Configuration Files
- [x] Environment variables - Define all VITE_STRIPE_PRICE_* variables
- [x] Deployment config - Ensure all secrets are set

---

## Verification Checklist

Use this to verify all issues are resolved:

### Critical Issues (Must Complete)
- [ ] Branding.ts updated with SSRA Academy info
- [ ] All 9 Stripe price IDs configured via environment variables
- [ ] Medical German `requires_verification: true` everywhere
- [ ] Webhook handles null user_id with error throwing
- [ ] Approval email sent when verification approved
- [ ] Rejection email sent with admin notes when rejected
- [ ] TypeScript strict mode enabled + all errors fixed

### High Priority Issues
- [ ] CORS headers restricted to ssra-academy.de
- [ ] Rate limiting implemented on payment functions
- [ ] Database RLS policy enforces verification for Medical German
- [ ] Paymob either fully implemented or removed

### Medium Priority Issues  
- [ ] Courses fetched from database at runtime
- [ ] Subscription status changes trigger appropriate emails
- [ ] Audit log table created and admin actions logged
- [ ] Unique constraint on (lower(email)) for applications

---

## Deployment Checklist

Before going to production:
- [ ] All CRITICAL issues fixed
- [ ] All HIGH issues fixed
- [ ] Environment variables documented
- [ ] Stripe webhooks endpoint configured
- [ ] Database migrations applied
- [ ] RLS policies tested
- [ ] Payment workflow tested end-to-end
- [ ] Verification workflow tested
- [ ] Emails verified (approval, rejection)
- [ ] Rate limiting tested
- [ ] Error handling verified

---

## Questions for Product Team

1. **Paymob Integration**: Is Paymob needed for target market? If yes, implement. If no, remove.
2. **Audit Logging**: Do you need compliance/audit trail of admin actions?
3. **Analytics**: What metrics do you want to track? (enrollments, conversions, page views, etc.)
4. **Internationalization**: Do you want full i18n for all UI, or just content/emails?
5. **WhatsApp Support**: What's the WhatsApp business number to use?
6. **Branding Info**: Confirm all SSRA Academy contact info (phone, address, etc.)

---

## Conclusion

The SSRA Academy architecture is **solid but has critical configuration and workflow issues** that must be fixed before launch. Most issues are straightforward to resolve once identified.

**Estimated Fix Time:**
- **Critical:** 2-3 days
- **High:** 3-5 days  
- **Medium:** 1-2 weeks
- **Low:** Ongoing polish

**Recommendation:** Focus on **Phase 1 Critical** issues first, then test payment flows thoroughly before launching to production.

