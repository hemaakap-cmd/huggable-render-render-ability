## Goal
Make every SSRA course carry start date/time, duration, type, and instructor — enforced from DB to admin to checkout to post-payment emails.

## 1. Database (migration)
Add columns to `ssra_courses`:
- `start_date` (date)
- `start_time` (time)
- `duration` (text, e.g. "8 weeks · 2h/session")
- `end_date` (date, nullable — auto-calculated when possible)
- `instructor_name` (text)
- `course_format` (text: 'online' | 'recorded' | 'live')

Add a CHECK-trigger so a course can only have `is_active = true` when all required fields above are non-null/non-empty.

Extend `ssra_enrollments` with snapshot fields used by emails & admin:
- `course_title_snapshot`, `start_date_snapshot`, `start_time_snapshot`, `duration_snapshot`, `instructor_snapshot`, `order_number` (auto from id), `paid_at`.

## 2. Admin – Course editor (`AdminCourses.tsx`)
- Add inputs for the new fields.
- "Publish/Activate" button disabled unless all required fields are filled — show inline error list.
- Validation on save (zod schema) — server-side trigger backs it up.

## 3. Public course detail page (`CourseDetail.tsx`)
Add a Schedule card showing: Start Date, Start Time, Duration, Course Type, Instructor. Pull from `ssra_courses` (live data, not stripe.ts catalog).

## 4. Checkout (`Checkout.tsx`)
Render an order summary before Pay button:
- Course name, start date, start time, duration, final price.
- Block submission if any of date/time/duration are missing (defensive — should already be impossible).

## 5. Stripe webhook (`stripe-webhook/index.ts`)
On successful payment:
- Insert/update `ssra_enrollments` with snapshot fields + `paid_at` + generated `order_number` (e.g. `SSRA-ENR-YYYY-XXXXXX`).
- Invoke `send-transactional-email` twice:
  - `payment-confirmation` (receipt)
  - `enrollment-confirmation` (course access)

## 6. Email templates
Create two React Email templates in `supabase/functions/_shared/transactional-email-templates/`:
- `payment-confirmation.tsx` — student name, course, amount, payment date, order number, contact info.
- `enrollment-confirmation.tsx` — student name, course, start date/time, duration, instructor, access link, contact info.

Register both in `registry.ts` and redeploy `send-transactional-email`.

## 7. Confirmation page (`PaymentSuccess.tsx`)
Rebuild to show:
- ✅ Payment successful
- Course info (title, start date/time, duration, instructor)
- Order number, student email
- "Access your course" CTA → dashboard route.

Fetch the enrollment row by `session_id` from URL (`?session_id=...&courseId=...`).

## 8. Admin enrollments view (`AdminEnrollments.tsx`)
Surface the new snapshot columns + order number, payment date, amount.

## Files to touch
- New migration (ssra_courses + ssra_enrollments + validation trigger + GRANTs unchanged)
- `src/pages/ssra-admin/AdminCourses.tsx`
- `src/pages/ssra-admin/AdminEnrollments.tsx`
- `src/pages/CourseDetail.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/PaymentSuccess.tsx`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/_shared/transactional-email-templates/payment-confirmation.tsx` (new)
- `supabase/functions/_shared/transactional-email-templates/enrollment-confirmation.tsx` (new)
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Redeploy `send-transactional-email` + `stripe-webhook`

## Out of scope (confirm if needed)
- Migrating the hard-coded `COURSES` array in `src/lib/stripe.ts` to fully DB-driven (currently hybrid). I'll read schedule from DB but keep stripe price-id mapping where it already lives.

Approve and I'll execute end-to-end.