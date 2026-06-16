# SSRA Academy – Pre-Launch UX Overhaul

A focused pass to reframe the student experience around the **monthly support / pay-what-you-can** model and surface the most important info (course start, next session, how to continue learning) the moment a student logs in.

Scope is **frontend / presentation only** — no schema, no payment-logic changes. Pricing copy and minimum amount (€10) are content updates; existing donation checkout already accepts a variable amount.

---

## 1. Student Dashboard (`StudentDashboard.tsx`) — full redesign

New layout, top to bottom:

```
WELCOME BACK, <name>
┌─────────────────────────────────────────────┐
│ CURRENT COURSE — Medical German             │
│ Starts 1 July 2026 · Every Tue · 21:00 CET  │
│ Instructor: Mr Mahmud Hammam · 41.8 hrs     │
│ Progress ▓░░░░░░░░░░ 0%  (Lesson 0 of 32)   │
│ [ Start Learning ] [ Join Live ] [ Manage ] │
└─────────────────────────────────────────────┘
┌──── Next Session ────┐ ┌──── Subscription ───┐
│ Medical German       │ │ Status: Active      │
│ 1 Jul 2026 · 21:00   │ │ Next billing: …     │
│ [ Add to calendar ]  │ │ [ Manage ]          │
└──────────────────────┘ └─────────────────────┘
┌──── Quick links: Materials · Homework · Certificates · Profile ────┐
```

- "Upcoming Sessions = 0" tile removed; replaced with **Next Session** card. If no scheduled sessions, show the course's `start_date / start_time` as the next session.
- Progress block reads from existing homework/materials counts; if none, shows `0%` with "Lessons unlock as the course begins".
- All three primary buttons present:
  - **Start Learning** → `/dashboard/materials`
  - **Join Live Session** → `/dashboard/sessions`
  - **Manage Subscription** → `/dashboard/subscription`

## 2. My Courses (`MyCourses.tsx`) — de-duplicate

- Rename heading `One-time Enrollments` → **My Active Courses**.
- The big "Active Subscription" hero card is removed from this page (it lives on the Subscription page and the dashboard). Subscription course is rendered as a normal card in the same list with an "Active subscription" badge, so each course appears once.
- Each card gains a **Course Information** panel: start date, time (CET), instructor, duration, next live session, plus a **Start Learning** primary button and a smaller "Join live session" link.

## 3. Subscription page (`MySubscription.tsx`)

Student-friendly layout:

- **Payment Information** block: Status · Monthly amount · Next billing date · Payment method (brand · last4 if available, otherwise "Card on file") · "Cancel anytime".
- Big **Manage Subscription** button (opens Stripe portal — wiring already exists).
- Hide raw IDs (`sub_…`, `cus_…`) behind a collapsed "Technical details" disclosure for support purposes.

## 4. Order Status (`OrderStatus.tsx`) — student-friendly

- Hide `SSRA-ENR-…` order numbers and internal "registration confirmed" record blocks from the main view.
- Show: Course · Status (Active / Pending / Cancelled) · Amount · Date.
- Move internal IDs into a small "Reference" line shown only on click (for support).

## 5. Sessions (`MySessions.tsx`)

- When zero sessions exist, show a friendly **Next Session** card built from course start date instead of an empty state, matching the dashboard.

## 6. Pricing page (`Pricing.tsx`) — reframe

- Remove the hard `€19/month` headline.
- New headline: **Choose your monthly support · Pay what you can · Minimum €10**.
- Slider / preset chips (€10 · €15 · €25 · custom) feeding the existing donation checkout. Copy: "Renews automatically every month · Cancel anytime."

## 7. Checkout page (`Checkout.tsx`) — recurring clarity

- Add a prominent notice above the pay button:
  > "Your selected amount will renew automatically every month. Cancel anytime from your dashboard."
- Show monthly amount + "Next renewal: <date>" preview.

## 8. Shared content

- Course meta (start date, time, instructor, duration, lesson count) read from existing `ssra_courses` row when present; fall back to the supplied defaults (1 Jul 2026, 21:00 CET, Mahmud Hammam, 41.8 hrs, 32 lessons) so the UI is never empty pre-launch.

---

## Technical notes

- All edits are React/Tailwind in `src/pages/dashboard/*`, `src/pages/Checkout.tsx`, `src/pages/Pricing.tsx`, plus a small `src/lib/courseDefaults.ts` helper for fallback metadata.
- No DB migrations. No edge-function changes. No changes to Stripe amounts / currency logic.
- Dark premium look preserved (slate-950 sidebar, blue accent `hsl(220 91% 54%)`, gradient hero cards already in use).
- Existing hooks reused: `useMyEnrollments`, `useMySubscription`, `useSsraAuth`, `useCurrency`.

## Out of scope (call out explicitly)

- Real lesson-level progress tracking (no lessons table exists yet) — progress shown is derived from homework completion; a true LMS progress system is a separate feature.
- Stripe portal / billing logic — unchanged.
- Backend pricing rules — already supports variable amount via donation checkout; only copy changes.

Approve and I'll ship it.
