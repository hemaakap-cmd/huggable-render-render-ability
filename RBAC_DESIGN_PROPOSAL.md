# SSRA Academy — Role-Based Access Control Design Proposal
**Date:** 2026-06-03 (updated 2026-06-03)
**Type:** Architecture proposal — no code changes made
**Scope:** Student visibility, permission matrix, dashboard layout per role

---

## 0. Confirmed Requirements

### Admin CAN see (confirmed by SSRA)

| # | Field | Source |
|---|---|---|
| 1 | Full Name | `ssra_profiles.full_name` |
| 2 | Email | `ssra_profiles.email` |
| 3 | Phone Number | `ssra_profiles.phone` *(new column)* |
| 4 | Country | `ssra_profiles.country` |
| 5 | City | `ssra_profiles.city` *(new column)* |
| 6 | Degree | `ssra_profiles.degree` |
| 7 | German Level | `ssra_profiles.german_level` |
| 8 | Registration Date | `ssra_profiles.created_at` |
| 9 | Verification Status | `ssra_verifications.status` |
| 10 | Verification Notes | `ssra_verifications.admin_notes` |
| 11 | Verification History | All `ssra_verifications` rows for student (not just latest) |
| 12 | Enrolled Courses | `ssra_enrollments` — course name + date, **no amounts** |
| 13 | Active Subscription Status | `ssra_subscriptions.status` + renewal date |
| 14 | Session Attendance | `ssra_session_attendance` — session name + date + present/absent |
| 15 | Student Notes | `ssra_student_notes` *(new table)* |

### Admin CANNOT see (confirmed by SSRA)

| # | Blocked Data | Current Location | Enforcement |
|---|---|---|---|
| 1 | Revenue analytics | `AdminRevenue` page | Route → `RequireSuperAdmin` |
| 2 | Payment amounts (€) | `AdminEnrollments.amount_eur` | Hide column |
| 3 | Monthly Recurring Revenue (MRR) | `AdminDashboard` KPI card | Hide card |
| 4 | Total Revenue (€) | `AdminDashboard` KPI card | Hide card |
| 5 | Revenue chart overlay | `AdminDashboard` growth chart | Remove bar |
| 6 | Per-transaction amounts | `AdminDashboard` Recent Payments | Remove panel |
| 7 | Finance dashboard | `/ssra-admin/finance` | Route already `RequireSuperAdmin` ✅ |
| 8 | Other admin management | `/ssra-admin/admins` | Route already `RequireSuperAdmin` ✅ |
| 9 | Super Admin notes | Not yet built | Never expose to admin role |
| 10 | Stripe IDs / customer data | `ssra_subscriptions.stripe_*` | Never include in admin queries |
| 11 | Total Customer Value | No display — never add | Never build |

### Super Admin sees everything above PLUS

| # | Field | Source |
|---|---|---|
| 1 | All payment amounts (€) | `ssra_enrollments.amount_eur` |
| 2 | MRR | Computed from `ssra_subscriptions` + `ssra_courses.price_eur` |
| 3 | Total platform revenue | Sum of `ssra_enrollments.amount_eur` |
| 4 | Revenue analytics charts | `AdminRevenue` page |
| 5 | Finance dashboard | `SuperAdminFinance` page |
| 6 | Stripe IDs | `ssra_subscriptions.stripe_subscription_id` |
| 7 | All admin notes (all authors) | `ssra_student_notes` |
| 8 | Admin management | `SuperAdminAdmins` page |
| 9 | Activity logs | `SuperAdminActivity` page |
| 10 | Impersonate students | `SuperAdminViewAs` page |

---

## 1. Current State Audit

### What admin currently sees that they SHOULD NOT

| Where | Data Exposed | Verdict |
|---|---|---|
| `AdminDashboard` KPI card | "One-Time Revenue" with € total | ❌ Remove |
| `AdminDashboard` KPI card | "Subscriptions" with `${mrr} MRR` sub-label | ❌ Remove |
| `AdminDashboard` chart | Revenue bar overlaid on student growth chart | ❌ Remove |
| `AdminDashboard` panel | "Recent Payments" showing student name + € amount | ❌ Remove |
| `AdminEnrollments` table | `amount_eur` column per transaction | ❌ Remove |
| `AdminEnrollments` table | `price_eur/mo` on subscription rows | ❌ Remove |
| `AdminEnrollments` header | "Total Revenue" €xxx card | ❌ Remove |
| `AdminRevenue` page | Full revenue analytics | ❌ Admin access blocked |
| `useSsraData.useAdminStats` | `totalRevenue`, `mrr` returned to admin | ❌ Filter out |

### What admin currently cannot see that they SHOULD

| Field | Current Status | Verdict |
|---|---|---|
| Phone number | Column does not exist in `ssra_profiles` | ➕ Add to schema |
| City | Column does not exist in `ssra_profiles` | ➕ Add to schema |
| Student notes | No table or column exists | ➕ Add new table |
| Student detail view | No dedicated page — only list views | ➕ Build new page |

---

## 2. Permission Matrix

### Legend
```
✅ Full access
👁️ Read only
✏️ Read + Write
❌ No access
—  Not applicable
```

---

### 2.1 Student Data Fields

| Field | Student (own) | Admin | Super Admin |
|---|---|---|---|
| Full Name | ✏️ | 👁️ | 👁️ |
| Email address | 👁️ (read only) | 👁️ | 👁️ |
| Phone Number | ✏️ | 👁️ | 👁️ |
| Country | ✏️ | 👁️ | 👁️ |
| City | ✏️ | 👁️ | 👁️ |
| Degree / Qualification | ✏️ | 👁️ | 👁️ |
| German Level | ✏️ | 👁️ | 👁️ |
| Registration Date | 👁️ | 👁️ | 👁️ |
| Avatar URL | ✏️ | ❌ | 👁️ |
| Other students' data | ❌ | 👁️ selected fields | ✅ |

---

### 2.2 Verification Data

| Field | Student (own) | Admin | Super Admin |
|---|---|---|---|
| Current verification status | 👁️ latest only | 👁️ | 👁️ |
| Full verification history | ❌ | 👁️ all records | 👁️ all records |
| Motivation text (per record) | 👁️ own | 👁️ | 👁️ |
| Graduation year | 👁️ own | 👁️ | 👁️ |
| Course applied for | 👁️ own | 👁️ | 👁️ |
| Admin review notes (per record) | 👁️ rejection reason only | ✏️ | ✏️ |
| Reviewer identity | ❌ | 👁️ | 👁️ |
| Reviewed at timestamp | ❌ | 👁️ | 👁️ |
| Approve / Reject action | ❌ | ✅ | ✅ |
| Export verifications CSV | ❌ | ✅ | ✅ |

---

### 2.3 Course & Enrollment Access

| Field | Student (own) | Admin | Super Admin |
|---|---|---|---|
| Enrolled courses list | 👁️ | 👁️ | 👁️ |
| Enrollment date | 👁️ | 👁️ | 👁️ |
| Enrollment status | 👁️ | 👁️ | 👁️ |
| **Amount paid (€)** | 👁️ via Stripe receipt | **❌** | ✅ |
| Active subscription status | 👁️ | 👁️ | 👁️ |
| Subscription renewal date | 👁️ | 👁️ | 👁️ |
| Cancel-at-period-end flag | 👁️ | 👁️ | 👁️ |
| Stripe subscription ID | ❌ | ❌ | 👁️ |
| Stripe customer ID | ❌ | ❌ | 👁️ |
| Stripe payment intent | ❌ | ❌ | 👁️ |
| Export enrollments CSV | ❌ | ✅ (no amounts) | ✅ (with amounts) |

---

### 2.4 Session & Attendance

| Field | Student (own) | Admin | Super Admin |
|---|---|---|---|
| Upcoming sessions | 👁️ subscribed course only | 👁️ all | 👁️ all |
| Past sessions | 👁️ subscribed course only | 👁️ all | 👁️ all |
| Session Zoom link | 👁️ subscribers only | 👁️ | 👁️ |
| Session Zoom password | 👁️ subscribers only | 👁️ | 👁️ |
| Own attendance record | 👁️ | 👁️ | 👁️ |
| All students' attendance | ❌ | ✅ mark / view | ✅ |
| Attendance summary (count + %) | 👁️ own | 👁️ per student | 👁️ per student |
| Session CRUD | ❌ | ✅ | ✅ |
| Recording URL | 👁️ subscribers only | 👁️ | 👁️ |

---

### 2.5 Admin Notes on Students

| Field | Student | Admin | Super Admin |
|---|---|---|---|
| View own admin note | ❌ | — | — |
| Write note about any student | ❌ | ✅ (own notes only) | ✅ all notes |
| View notes written by other admins | ❌ | ❌ | ✅ |
| Delete notes | ❌ | ✅ own notes | ✅ all |

> **Design decision:** Admin notes are private to the admin team. Students never see notes written about them. Each admin can write and edit their own notes per student. Super Admin can see all notes from all admins.

---

### 2.6 Financial Data

| Data | Student | Admin | Super Admin |
|---|---|---|---|
| Own payment receipts | 👁️ via Stripe portal | ❌ | ✅ |
| Platform total revenue (€) | ❌ | **❌** | ✅ |
| Monthly Recurring Revenue (MRR) | ❌ | **❌** | ✅ |
| Revenue per course breakdown | ❌ | **❌** | ✅ |
| Revenue growth chart | ❌ | **❌** | ✅ |
| Individual transaction amounts | ❌ | **❌** | ✅ |
| Revenue analytics page | ❌ | **❌ (route blocked)** | ✅ |
| Finance dashboard | ❌ | **❌ (route blocked)** | ✅ |

---

### 2.7 Platform & System

| Data | Student | Admin | Super Admin |
|---|---|---|---|
| Total student count (platform) | ❌ | 👁️ | ✅ |
| Student growth trend | ❌ | 👁️ count only, no revenue overlay | ✅ full |
| Pending verifications count | ❌ | ✅ | ✅ |
| Upcoming sessions count | ❌ | ✅ | ✅ |
| New students this week | ❌ | 👁️ | ✅ |
| Manage other admin users | ❌ | ❌ | ✅ |
| View admin activity log | ❌ | ❌ | ✅ |
| Impersonate students | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ✅ |
| Course CRUD | ❌ | ✅ | ✅ |

---

## 3. Required Schema Changes

The following fields do not currently exist and must be added.

### 3.1 `ssra_profiles` — add two columns

```sql
ALTER TABLE public.ssra_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city  text;
```

**RLS:** Same policy as existing profile fields — user can read/write own, admin can read all.

### 3.2 New table: `ssra_student_notes`

```sql
CREATE TABLE public.ssra_student_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ssra_student_notes ENABLE ROW LEVEL SECURITY;

-- Admins can create/read/update/delete their own notes
CREATE POLICY "admin_own_notes" ON public.ssra_student_notes
  FOR ALL USING (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.ssra_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Super admins can read all notes from all admins
CREATE POLICY "super_admin_read_all_notes" ON public.ssra_student_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ssra_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

### 3.3 `useSsraData.useAdminStats` — filter by role

The `useAdminStats` hook currently returns `totalRevenue` and `mrr` to any caller including regular admins. The hook must be split or the stats query must omit financial fields when the caller is not super_admin:

```
useAdminStats()      → returns student count, pending verifications,
                        upcoming sessions, new this week only
                        (available to admin + super_admin)

useSuperAdminStats() → returns everything above PLUS totalRevenue, mrr
                        (only called when isSuperAdmin === true)
```

---

## 4. Navigation Structure by Role

### 4.1 Admin Navigation (ADMIN_NAV)

```
Dashboard          /ssra-admin             ← KPIs: Students, Verifications, Sessions only
Students           /ssra-admin/students    ← Full student profile view (no amounts)
Verifications      /ssra-admin/verifications
Courses            /ssra-admin/courses
Sessions           /ssra-admin/sessions
Attendance         /ssra-admin/attendance
Enrollments        /ssra-admin/enrollments ← Shows course + date, NO amounts
```

**Removed from admin navigation:**
- ~~Revenue~~ — `/ssra-admin/revenue` — super admin only
- ~~Finance~~ — `/ssra-admin/finance` — super admin only

### 4.2 Super Admin Navigation (SUPER_NAV — shown in addition to all ADMIN_NAV items)

```
Activity Monitor   /ssra-admin/activity
Finance            /ssra-admin/finance    ← Full financial dashboard
Revenue            /ssra-admin/revenue    ← Revenue analytics + per-course breakdown
Manage Admins      /ssra-admin/admins
```

---

## 5. Dashboard Layout Proposals

---

### 5.1 Student Dashboard

**Purpose:** Self-service. Students see only their own data.

```
┌────────────────────────────────────────────────────────────────┐
│  Sidebar                │  Content Area                        │
│  ─────────────────────  │                                      │
│  Dashboard              │  ┌──────────┐ ┌──────────┐          │
│  My Courses             │  │ Courses  │ │Subscription│         │
│  My Sessions            │  │ enrolled │ │  status   │          │
│  My Subscription        │  └──────────┘ └──────────┘          │
│  My Profile             │                                      │
│                         │  ┌──────────────────────────────┐    │
│                         │  │ Verification status banner    │    │
│                         │  │ (pending / approved / rejected│    │
│                         │  │  + rejection reason if any)   │    │
│                         │  └──────────────────────────────┘    │
│                         │                                      │
│                         │  ┌──────────────────────────────┐    │
│                         │  │ Upcoming Zoom sessions        │    │
│                         │  │ (subscribers only)            │    │
│                         │  └──────────────────────────────┘    │
└─────────────────────────┴──────────────────────────────────────┘

Profile page fields available to edit:
  Full Name · Phone · Country · City · Degree · German Level
  (Email shown read-only, avatar optional)
```

---

### 5.2 Admin Dashboard

**Purpose:** Daily student management. Zero financial data visible.

```
┌────────────────────────────────────────────────────────────────┐
│  Sidebar                │  Content Area                        │
│  ─────────────────────  │                                      │
│  Dashboard          ←   │  ┌────────┐ ┌──────────┐ ┌───────┐  │
│  Students               │  │Total   │ │ Pending  │ │Upcoming│  │
│  Verifications          │  │Students│ │  Reviews │ │Sessions│  │
│  Courses                │  └────────┘ └──────────┘ └───────┘  │
│  Sessions               │                                      │
│  Attendance             │  ┌──────────────────────────────┐    │
│  Enrollments            │  │ Student Growth Chart         │    │
│                         │  │ (headcount only, no revenue) │    │
│                         │  └──────────────────────────────┘    │
│  ─────────────────────  │                                      │
│  [View Site]            │  ┌──────────────┐ ┌──────────────┐   │
│  [Sign Out]             │  │Recent        │ │Pending       │   │
│                         │  │Verifications │ │Verifications │   │
│                         │  │(name, status)│ │(name, Review)│   │
│                         │  └──────────────┘ └──────────────┘   │
│                         │                                      │
│                         │  ┌──────────────────────────────┐    │
│                         │  │ Upcoming Sessions             │    │
│                         │  └──────────────────────────────┘    │
└─────────────────────────┴──────────────────────────────────────┘
```

**Admin KPI cards (3 only — no financial cards):**
1. Total Students + "N new this week"
2. Pending Verifications + "Needs attention" / "All clear"
3. Upcoming Sessions

**Admin Growth Chart:**
- Student headcount trend only (blue area)
- Revenue bar removed entirely

**Admin "Recent Payments" panel:** Removed entirely — replaced with "Recent Enrollments" showing student name + course name + date (no amounts)

---

### 5.3 Admin — Student Detail Page (new page)

**URL:** `/ssra-admin/students/:id`
**Purpose:** Complete view of a single student. All 15 admin-permitted fields in one place. No financial data.

**Data sources for this page:**
| Section | Query |
|---|---|
| Profile header | `ssra_profiles` WHERE id = studentId |
| Personal & Academic | same row |
| Registration Date | `ssra_profiles.created_at` |
| Verification Status | Latest `ssra_verifications` row |
| Verification History | All `ssra_verifications` rows for student (ordered by created_at DESC) |
| Enrolled Courses | `ssra_enrollments` JOIN `ssra_courses` — **no amount_eur** |
| Subscription Status | `ssra_subscriptions` WHERE status IN (active, trialing, past_due) |
| Attendance Summary | `ssra_session_attendance` JOIN `ssra_sessions` — with present/absent |
| Admin Notes | `ssra_student_notes` WHERE student_id = studentId AND admin_id = current admin |

> **Note on Verification History:** `useMyVerification()` currently returns only the most recent record.
> The Student Detail page requires a new hook `useStudentVerificationHistoryById(userId)` that
> returns ALL verification rows for the student, ordered newest first.

```
┌───────────────────────────────────────────────────────────────────┐
│  ← Back to Students                                               │
│                                                               [Export]
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  [S]  Samira Al-Rashidi                                   │    │
│  │       samira@email.com  ·  Registered: 1 Jan 2026        │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌──────────────────────┐   ┌──────────────────────────────┐      │
│  │ PERSONAL             │   │ ACADEMIC                      │      │
│  │ Phone:  +20 10 ...   │   │ Degree:  BSc Sports Science   │      │
│  │ Country: Egypt       │   │ German Level: B1              │      │
│  │ City:    Cairo       │   │                               │      │
│  └──────────────────────┘   └──────────────────────────────┘      │
│                                                                   │
│  ──────────────── VERIFICATION ───────────────────────────────    │
│                                                                   │
│  Current Status: [✓ Approved]                                     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ VERIFICATION HISTORY                                     │    │
│  │                                                          │    │
│  │ [✓ Approved]  2 Jun 2026                                 │    │
│  │ Reviewed by: Admin A                                     │    │
│  │ Notes: "Confirmed BSc graduate, motivation clear"        │    │
│  │ Motivation: "I want to work in German clinics..."        │    │
│  │ Degree: BSc Sports Science · Country: Egypt · Level: B1  │    │
│  │                                                          │    │
│  │ [✗ Rejected]  15 May 2026                                │    │
│  │ Reviewed by: Admin B                                     │    │
│  │ Notes: "Insufficient motivation — too short"             │    │
│  │ Motivation: "I want to study German."                    │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ──────────────── COURSES & SUBSCRIPTION ─────────────────────    │
│                                                                   │
│  ┌──────────────────────┐   ┌──────────────────────────────┐      │
│  │ ENROLLED COURSES     │   │ ACTIVE SUBSCRIPTION           │      │
│  │                      │   │                               │      │
│  │ Anatomie für Reha    │   │ Medizinisches Deutsch         │      │
│  │ Enrolled: 1 May 2026 │   │ Status: Active                │      │
│  │ Status: Active       │   │ Renews: 1 Jul 2026            │      │
│  │                      │   │ Cancel at period end: No      │      │
│  │ (no amounts shown)   │   │ (no Stripe IDs shown)         │      │
│  └──────────────────────┘   └──────────────────────────────┘      │
│                                                                   │
│  ──────────────── ATTENDANCE SUMMARY ─────────────────────────    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  5 sessions total · 4 attended · 1 absent · 80%          │    │
│  │                                                          │    │
│  │  ✓  Session 5 — Medical German — 26 May 2026             │    │
│  │  ✓  Session 4 — Medical German — 19 May 2026             │    │
│  │  ✗  Session 3 — Medical German — 12 May 2026  [absent]   │    │
│  │  ✓  Session 2 — Medical German —  5 May 2026             │    │
│  │  ✓  Session 1 — Medical German — 28 Apr 2026             │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ──────────────── ADMIN NOTES ─────────────────────────────────   │
│  (private — student never sees these)                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Admin A · 2 Jun 2026                                    │    │
│  │  "Student called to ask about EGP pricing option."       │    │
│  │                                                    [Edit] │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐    │    │
│  │  │ Add a new note...                                │    │    │
│  │  └──────────────────────────────────────────────────┘    │    │
│  │                                            [Save Note]   │    │
│  └───────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```

**Fields confirmed visible to Admin on this page:**

| # | Field | Source | Shown |
|---|---|---|---|
| 1 | Full Name | `ssra_profiles.full_name` | Header |
| 2 | Email | `ssra_profiles.email` | Header |
| 3 | Registration Date | `ssra_profiles.created_at` | Header |
| 4 | Phone | `ssra_profiles.phone` | Personal section |
| 5 | Country | `ssra_profiles.country` | Personal section |
| 6 | City | `ssra_profiles.city` | Personal section |
| 7 | Degree | `ssra_profiles.degree` | Academic section |
| 8 | German Level | `ssra_profiles.german_level` | Academic section |
| 9 | Verification Status | `ssra_verifications.status` (latest) | Verification section |
| 10 | Verification Notes | `ssra_verifications.admin_notes` (per record) | Verification History |
| 11 | Verification History | All `ssra_verifications` rows | Verification History |
| 12 | Enrolled Courses | `ssra_enrollments` + course name | Courses section |
| 13 | Subscription Status | `ssra_subscriptions.status` + renewal date | Subscription section |
| 14 | Attendance Summary | `ssra_session_attendance` count + per-session | Attendance section |
| 15 | Admin Notes | `ssra_student_notes` (own notes) | Notes section |

**Fields explicitly NOT shown on this page:**

| Blocked Field | Reason |
|---|---|
| `ssra_enrollments.amount_eur` | Financial — admin cannot see |
| `ssra_courses.price_eur` | Financial — admin cannot see |
| `ssra_subscriptions.stripe_subscription_id` | Internal Stripe reference |
| `ssra_subscriptions.stripe_customer_id` | Internal Stripe reference |
| `ssra_enrollments.stripe_payment_intent` | Internal Stripe reference |
| Other admins' notes | Scoped to current admin only (super admin sees all) |

---

### 5.4 Super Admin Dashboard

**Purpose:** Full platform visibility including financial data. Sees everything admin sees plus financial layer.

```
┌────────────────────────────────────────────────────────────────┐
│  Sidebar                │  Content Area                        │
│  ─────────────────────  │                                      │
│  [Admin section]        │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐  │
│  Dashboard              │  │Total │ │Revenu│ │Active│ │Pend│  │
│  Students               │  │Stud. │ │  €   │ │ Subs │ │ ing│  │
│  Verifications          │  │      │ │ +MRR │ │      │ │Rev.│  │
│  Courses                │  └──────┘ └──────┘ └──────┘ └────┘  │
│  Sessions               │                                      │
│  Attendance             │  ┌──────────────────────────────┐    │
│  Enrollments            │  │ Growth + Revenue Chart        │    │
│                         │  │ (students + revenue overlay)  │    │
│  ─────────────────────  │  └──────────────────────────────┘    │
│  [Crown] Super Admin    │                                      │
│  Activity Monitor       │  ┌──────────────┐ ┌──────────────┐   │
│  Finance                │  │Recent        │ │Pending       │   │
│  Revenue                │  │Payments (€)  │ │Verifications │   │
│  Manage Admins          │  └──────────────┘ └──────────────┘   │
│                         │                                      │
│  ─────────────────────  │  ┌──────────────────────────────┐    │
│  [View Site]            │  │ Super Admin Quick Links:      │    │
│  [Sign Out]             │  │ Activity · Finance · Admins  │    │
│                         │  └──────────────────────────────┘    │
└─────────────────────────┴──────────────────────────────────────┘
```

**Super Admin KPI cards (5):**
1. Total Students + new this week
2. One-Time Revenue (€)
3. Active Subscriptions + MRR
4. Pending Verifications
5. Upcoming Sessions

**Super Admin Enrollments page:** Full view including `amount_eur`, `price_eur/mo`, Stripe IDs, CSV with all financial columns.

---

## 6. Data Access Restrictions — Implementation Summary

### 6.1 Route-Level (frontend `App.tsx`)

| Route | Current Guard | Proposed Guard |
|---|---|---|
| `/ssra-admin/revenue` | `RequireAdmin` | `RequireSuperAdmin` |
| `/ssra-admin/finance` | `RequireSuperAdmin` | `RequireSuperAdmin` ✅ already correct |
| `/ssra-admin/admins` | `RequireSuperAdmin` | `RequireSuperAdmin` ✅ already correct |
| `/ssra-admin/activity` | `RequireSuperAdmin` | `RequireSuperAdmin` ✅ already correct |
| `/ssra-admin/students/:id` | does not exist | `RequireAdmin` (new page) |

### 6.2 Component-Level (conditional rendering)

| Component | Condition to show | Change needed |
|---|---|---|
| "One-Time Revenue" KPI card | `isSuperAdmin` | Hide from admin |
| "Subscriptions" KPI with MRR | `isSuperAdmin` | Hide from admin |
| Revenue bar in Growth chart | `isSuperAdmin` | Remove bar when !isSuperAdmin |
| "Recent Payments" panel | `isSuperAdmin` | Replace with "Recent Enrollments" (no amounts) |
| Amount column in Enrollments | `isSuperAdmin` | Hide € column when !isSuperAdmin |
| Total Revenue card in Enrollments | `isSuperAdmin` | Hide when !isSuperAdmin |
| Finance Quick Link in Dashboard | `isSuperAdmin` | Already gated ✅ |

### 6.3 Query-Level (`useSsraData.ts`)

| Hook | Change |
|---|---|
| `useAdminStats` | Split into `useAdminStats` (no revenue) + `useSuperAdminStats` (with revenue) |
| `useAdminEnrollments` | Query still fetches `amount_eur` — only display layer changes |
| `useRevenueGrowth` | Called only from super-admin-gated components |

### 6.4 API/RLS Level

No RLS changes are required for financial data. The financial amounts live in `ssra_enrollments.amount_eur` and `ssra_courses.price_eur`, which admins already have SELECT access to via current RLS. **The restriction is enforcement at the UI layer only** — which is consistent with how the admin portal works (it is a trusted internal tool, not a public API).

If RLS-level enforcement is desired, `amount_eur` can be removed from the admin's `ssra_enrollments` SELECT policy and kept only in the super_admin policy. This is a stronger guarantee but adds schema complexity.

---

## 7. Fields Missing from Current Schema

### Additions required before implementation

| Field | Table | Type | Notes |
|---|---|---|---|
| `phone` | `ssra_profiles` | `text` | Optional, no uniqueness required |
| `city` | `ssra_profiles` | `text` | Optional, free text |
| `ssra_student_notes` | new table | — | Per-student, per-admin notes |

### New table structure: `ssra_student_notes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | auto-generated |
| `student_id` | uuid FK → auth.users | the student being noted |
| `admin_id` | uuid FK → auth.users | the admin writing the note |
| `note` | text NOT NULL | note content |
| `created_at` | timestamptz | auto-set |
| `updated_at` | timestamptz | auto-updated by trigger |

---

## 8. New Data Hooks Required

The Student Detail page needs hooks that do not currently exist.

| Hook | Query | Used by |
|---|---|---|
| `useStudentProfileById(id)` | `ssra_profiles` WHERE id | Already exists ✅ |
| `useStudentEnrollmentsById(id)` | `ssra_enrollments` JOIN courses — **select no amount_eur** | Already exists but must drop amount |
| `useStudentSubscriptionById(id)` | `ssra_subscriptions` — status + renewal only, no Stripe IDs | Already exists but must drop Stripe fields |
| `useStudentVerificationHistoryById(id)` | ALL `ssra_verifications` WHERE user_id ordered by created_at DESC | **Does not exist — must create** |
| `useStudentAttendanceById(id)` | `ssra_session_attendance` JOIN sessions | Already exists ✅ |
| `useStudentNotesById(id)` | `ssra_student_notes` WHERE student_id (scoped to admin_id) | **Does not exist — must create** |
| `useCreateStudentNote()` | INSERT into `ssra_student_notes` | **Does not exist — must create** |
| `useUpdateStudentNote()` | UPDATE `ssra_student_notes` WHERE id AND admin_id = caller | **Does not exist — must create** |

**Key constraint on `useStudentVerificationHistoryById`:**
```ts
// Returns ALL verification attempts, not just the latest
// Current useStudentVerificationById returns .maybeSingle() — wrong for history
supabase
  .from("ssra_verifications")
  .select("id, status, motivation, degree, country, german_level, graduation_year,
           course_id, admin_notes, reviewed_by, reviewed_at, created_at,
           reviewer:ssra_profiles!ssra_verifications_reviewed_by_fkey(full_name)")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  // No .limit(1) or .maybeSingle()
```

**Attendance summary computation (client-side from existing data):**
```ts
const total    = attendance.length;
const attended = attendance.filter(a => a.attended_at).length;  // all rows = attended
const absent   = totalSessions - attended;  // requires session count from a separate query
const pct      = total > 0 ? Math.round((attended / totalSessions) * 100) : 0;
```
> Note: "absent" requires knowing total scheduled sessions for the course, not just attendance records (which only exist for attended sessions). This requires joining `ssra_sessions` for the course.

---

## 9. Summary of Changes Required

### New — must build from scratch

| # | Item | Files |
|---|---|---|
| 1 | Student Detail page `/ssra-admin/students/:id` | New `AdminStudentDetail.tsx` |
| 2 | `ssra_student_notes` DB table + RLS | New migration |
| 3 | `phone` + `city` columns on `ssra_profiles` | New migration (ALTER TABLE) |
| 4 | `useStudentVerificationHistoryById` hook | `useSsraData.ts` |
| 5 | `useStudentNotesById` hook | `useSsraData.ts` |
| 6 | `useCreateStudentNote` mutation | `useSsraData.ts` |
| 7 | `useUpdateStudentNote` mutation | `useSsraData.ts` |
| 8 | `useSuperAdminStats` hook (split from `useAdminStats`) | `useSsraData.ts` |
| 9 | Phone + City fields in `MyProfile.tsx` | `src/pages/dashboard/MyProfile.tsx` |

### Modified — existing files that must change

| # | File | What changes |
|---|---|---|
| 1 | `AdminDashboard.tsx` | Remove Revenue + MRR KPI cards; remove revenue bar from chart; replace "Recent Payments" with "Recent Enrollments" (no amounts) |
| 2 | `AdminEnrollments.tsx` | Hide `amount_eur` column and Total Revenue card when `!isSuperAdmin` |
| 3 | `AdminLayout.tsx` | Move "Revenue" from `ADMIN_NAV` to `SUPER_NAV` |
| 4 | `App.tsx` | Change `/ssra-admin/revenue` to `RequireSuperAdmin`; add `/ssra-admin/students/:id` route |
| 5 | `useSsraData.useAdminStats` | Remove `totalRevenue` + `mrr`; move to `useSuperAdminStats` |
| 6 | `useStudentEnrollmentsById` | Remove `amount_eur` from SELECT |
| 7 | `useStudentSubscriptionById` | Remove `stripe_subscription_id`, `stripe_customer_id` from SELECT |
| 8 | `AdminStudents.tsx` | Add clickable row linking to `/ssra-admin/students/:id` |

### No change needed

| Item | Reason |
|---|---|
| RLS policies for enrollments/profiles | Admin already has SELECT — restriction is UI-layer only |
| `/ssra-admin/finance` route | Already `RequireSuperAdmin` ✅ |
| `/ssra-admin/admins` route | Already `RequireSuperAdmin` ✅ |
| `/ssra-admin/activity` route | Already `RequireSuperAdmin` ✅ |
| Student dashboard | Already shows only own data ✅ |
| Verification approval/rejection flow | Works correctly for both roles ✅ |
| Email notification system | No changes needed ✅ |

---

*End of architecture proposal.*
*Ready for implementation approval.*
