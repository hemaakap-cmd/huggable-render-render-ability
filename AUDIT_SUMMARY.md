# SSRA Architecture Audit - Executive Summary

**Generated:** June 2, 2026  
**Auditor:** Architecture Review  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## Quick Issue Count

| Severity | Count | Impact |
|----------|-------|--------|
| 🔴 CRITICAL | 7 | **Core functionality broken** |
| 🟠 HIGH | 5 | **Security & workflows** |
| 🟡 MEDIUM | 7 | **Data quality & consistency** |
| 🟢 LOW | 6 | **Polish & improvements** |
| **TOTAL** | **25** | **Must fix Phase 1 & 2** |

---

## Critical Issues (Must Fix Immediately)

### 1. Wrong Company Branding
**File:** `src/constants/branding.ts`  
**Status:** ❌ Has MASSAVO branding instead of SSRA  
**Fix Time:** 15 minutes  

### 2. Fake Stripe Price IDs
**File:** `src/lib/stripe.ts` (all 9 courses)  
**Status:** ❌ Fallback to fake IDs if env vars not set  
**Fix Time:** 30 minutes  

### 3. Missing Approval Email
**Workflow:** Verification → Admin Approves → No email sent to student  
**Status:** ❌ Broken workflow  
**Fix Time:** 2 hours  

### 4. Missing Rejection Email
**Workflow:** Verification → Admin Rejects → No email sent to student  
**Status:** ❌ Broken workflow  
**Fix Time:** 1 hour  

### 5. Medical German Verification Inconsistent
**Database:** `requires_verification = true`  
**Frontend:** `requires_verification = false`  
**Status:** ❌ Conflicting requirements  
**Fix Time:** 30 minutes  

### 6. Webhook Null User ID Bug
**File:** `supabase/functions/stripe-webhook/index.ts`  
**Status:** ❌ Can create orphaned enrollments  
**Risk:** Customer pays, but enrollment has no owner  
**Fix Time:** 1 hour  

### 7. TypeScript Type Safety Disabled
**File:** `tsconfig.json`  
**Status:** ❌ All strict checks OFF  
**Fix Time:** 4-8 hours (fixing type errors)  

---

## High Priority Issues (Fix This Week)

| # | Issue | File | Impact | Fix Time |
|---|-------|------|--------|----------|
| 8 | Paymob not integrated | `src/lib/paymob.ts` | Feature doesn't work | 4-6 hours |
| 9 | CORS too permissive | `supabase/functions/_shared/cors.ts` | Security risk | 30 minutes |
| 10 | No rate limiting | Payment functions | Abuse potential | 2 hours |
| 11 | Verification bypass | Database RLS | Security gap | 1 hour |
| 12 | Medical German config | Database + Frontend | Conflicts with #5 | See #5 |

---

## Data Consistency Issues

### Course Data Duplicated
- **Database:** 9 courses seeded in migration
- **Frontend:** 9 courses hardcoded in `src/lib/stripe.ts`
- **Problem:** Updates needed in 2 places
- **Solution:** Fetch from DB at runtime

### EGP Pricing Formula
- **Current:** Hardcoded `EUR * 55 = EGP`
- **Problem:** Exchange rate changes over time
- **Solution:** Store in config table

### Application Email Not Unique
- **Current:** Same email can submit multiple times
- **Solution:** Add unique constraint

---

## Security Vulnerabilities Found

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| CORS Open to `*` | HIGH | Restrict to domain |
| No Rate Limiting | HIGH | Add per-IP limits |
| Verification Bypass | HIGH | Add RLS policy |
| Webhook Null user_id | CRITICAL | Error instead of continue |
| Type Safety Off | CRITICAL | Enable strict mode |

---

## Payment System Status

```
✅ Stripe: Fully integrated (but has issues)
❌ Paymob: Configured but not connected
⚠️  Webhook: Has bugs with user resolution
⚠️  Price IDs: Fake fallbacks in code
```

---

## Workflow Completeness

### Enrollment Workflow
```
✅ Browse courses
✅ Select course
✅ Payment processing
❌ Post-purchase email (if subscription)
```

### Verification Workflow
```
✅ Student applies
✅ Confirmation email sent
✅ Admin reviews
❌ Approval email NOT sent ← BROKEN
❌ Rejection email NOT sent ← BROKEN
⚠️  Inconsistent requirements (DB vs Frontend)
```

### Subscription Workflow
```
✅ Checkout session created
✅ Payment processed
⚠️  Subscription status updates (missing error handling)
❌ Payment failed → no notification to user
```

---

## Quick Fix Priority

### Day 1 (Critical)
- [ ] Fix branding (15 min)
- [ ] Fix Stripe price IDs (30 min)
- [ ] Add approval email (2 hours)
- [ ] Add rejection email (1 hour)
- [ ] Fix Medical German config (30 min)
- [ ] Fix webhook null user_id (1 hour)
- **Total: ~5-6 hours**

### Days 2-3 (High Priority)
- [ ] Enable TypeScript strict mode (4-8 hours)
- [ ] Restrict CORS (30 min)
- [ ] Add rate limiting (2 hours)
- [ ] Add verification RLS policy (1 hour)
- [ ] Decide on Paymob (implement or remove) (4-6 hours)
- **Total: ~12-18 hours**

### Next Week (Medium Priority)
- [ ] Consolidate course data to DB (3-4 hours)
- [ ] Audit logging (4-6 hours)
- [ ] Subscription error handling (2 hours)
- [ ] Other data consistency fixes (2-4 hours)

---

## Risk Assessment

### If NOT Fixed Before Launch

| Issue | Impact | Likelihood | Severity |
|-------|--------|-----------|----------|
| Broken verification emails | Users confused | Very High | CRITICAL |
| Fake Stripe prices | Payments fail silently | Medium | CRITICAL |
| Type safety off | Silent bugs accumulate | High | HIGH |
| CORS open | CORS attacks possible | Low | HIGH |
| Null user IDs | Orphaned enrollments | Medium | CRITICAL |

---

## Environment Variables Required

```bash
# Stripe (with NO fallbacks)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2024-06-20

# Price IDs (9 required)
VITE_STRIPE_PRICE_GERMAN_SUB=price_...
VITE_STRIPE_PRICE_REHAB=price_...
VITE_STRIPE_PRICE_BEWEGUNG=price_...
VITE_STRIPE_PRICE_PRAXIS=price_...
VITE_STRIPE_PRICE_ANATOMIE=price_...
VITE_STRIPE_PRICE_TRAINING=price_...
VITE_STRIPE_PRICE_TELEFON=price_...
VITE_STRIPE_PRICE_BERUF=price_...
VITE_STRIPE_PRICE_DOSB=price_...

# Supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email (Resend)
RESEND_API_KEY=re_...

# Optional
VITE_WHATSAPP_NUMBER=+49...
```

**Important:** All STRIPE_PRICE_* variables are REQUIRED or payments will fail.

---

## Files to Review

### Must Fix (Critical)
- ✅ `src/constants/branding.ts` - Wrong branding
- ✅ `src/lib/stripe.ts` - Fake price IDs
- ✅ `tsconfig.json` - Type safety off
- ✅ `supabase/functions/stripe-webhook/index.ts` - Null user_id
- ✅ `src/pages/ssra-admin/AdminVerifications.tsx` - Missing emails

### Should Fix (High)
- ✅ `supabase/functions/_shared/cors.ts` - CORS
- ✅ `supabase/migrations/` - RLS policies
- ✅ `src/lib/paymob.ts` - Integration status

### Consider Fixing (Medium)
- ✅ `src/hooks/useSsraData.ts` - Fetch courses from DB
- ✅ `supabase/migrations/` - Data consistency

---

## Testing Checklist

Before going live:

### Payment Flow
- [ ] Create checkout session with each course
- [ ] Complete payment in Stripe
- [ ] Verify webhook triggers
- [ ] Confirm enrollment in database
- [ ] Verify user can access course

### Verification Flow
- [ ] Submit application
- [ ] Check confirmation email sent
- [ ] Approve in admin
- [ ] Check approval email sent ← CURRENTLY FAILS
- [ ] Check student can enroll

### Error Cases
- [ ] Try to enroll in Medical German without verification
- [ ] Try to access course without enrollment
- [ ] Failed payment recovery
- [ ] Verify past_due subscriptions deny access

---

## Recommended Next Steps

1. **Create issues:** Enter all 25 issues into your issue tracker
2. **Prioritize:** Work on CRITICAL items first (7 issues)
3. **Review:** Schedule review after Phase 1 fixes
4. **Test:** Run full payment flow tests
5. **Deploy:** Only after all Critical + High issues fixed

---

## For More Details

See: [ARCHITECTURE_AUDIT_REPORT.md](ARCHITECTURE_AUDIT_REPORT.md) (comprehensive 25+ issue deep-dive)

