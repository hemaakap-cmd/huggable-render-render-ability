# SSRA Academy - Comprehensive Architectural Analysis

**Project**: SSRA Academy (Sports Science & Rehabilitation Academy for Arabic Speakers)  
**Description**: Online course platform for German-language sports science education targeting Arabic speakers  
**Date**: June 2, 2026  

---

## EXECUTIVE SUMMARY

SSRA Academy is a modern SaaS platform with a React frontend, Supabase PostgreSQL backend, and Stripe payment integration. The architecture follows a clean separation of concerns with:

- **Frontend**: React 18 + TypeScript with code-split lazy routing
- **Backend**: Supabase with PostgreSQL, RLS policies, and Deno Edge Functions
- **Authentication**: Supabase Auth with OTP via email
- **Payments**: Stripe (primary), Paymob (configured but not integrated)
- **Internationalization**: i18next (German + English)
- **UI Framework**: Radix-UI components + Tailwind CSS

The system manages a complete student lifecycle: application → verification → enrollment → payment → course access, with admin dashboards for course management, student verification, revenue tracking, and session management.

---

## 1. FRONTEND ARCHITECTURE

### 1.1 Technology Stack

| Component | Library | Version |
|-----------|---------|---------|
| Framework | React | 18.3.1 |
| Routing | React Router DOM | 6.30.1 |
| Type System | TypeScript | 5.8.3 |
| Build Tool | Vite | 5.4.19 |
| CSS Framework | Tailwind CSS | 3.4.17 |
| UI Components | Radix-UI | Various (^1.x) |
| Forms | React Hook Form | 7.61.1 |
| Validation | Zod | 3.25.76 |
| State/Data | TanStack React Query | 5.83.0 |
| Icons | Lucide React | 0.462.0 |
| Charts | Recharts | 2.15.4 |
| Notifications | Sonner | 1.7.4 |
| i18n | i18next + react-i18next | 25.8.0 |
| Database Client | @supabase/supabase-js | 2.91.1 |
| Stripe Client | @stripe/stripe-js | 8.11.0 |

### 1.2 Project Structure

```
src/
├── pages/                          # Route-level page components
│   ├── Index.tsx                  # Homepage
│   ├── Courses.tsx                # Course catalog
│   ├── Pricing.tsx                # Pricing table
│   ├── Apply.tsx                  # Student verification form
│   ├── Checkout.tsx               # Payment gateway page
│   ├── PaymentSuccess.tsx         # Confirmation page
│   ├── PaymentCanceled.tsx        # Failed payment page
│   ├── StudentLogin.tsx           # OTP authentication
│   ├── ResetPassword.tsx          # Password reset
│   ├── About.tsx, Contact.tsx, Legal.tsx
│   ├── dashboard/
│   │   ├── StudentDashboard.tsx   # Overview
│   │   ├── MyCourses.tsx          # Enrolled courses list
│   │   ├── MySessions.tsx         # Upcoming Zoom classes
│   │   ├── MySubscription.tsx     # Subscription management
│   │   └── MyProfile.tsx          # User profile editor
│   └── ssra-admin/
│       ├── AdminDashboard.tsx     # Admin analytics
│       ├── AdminStudents.tsx      # Student list + search
│       ├── AdminVerifications.tsx # Application review queue
│       ├── AdminCourses.tsx       # Course CRUD
│       ├── AdminSessions.tsx      # Zoom session management
│       ├── AdminEnrollments.tsx   # Sales history
│       ├── AdminAttendance.tsx    # Session attendance
│       ├── SuperAdminFinance.tsx  # Revenue analytics
│       ├── SuperAdminAdmins.tsx   # Admin management
│       └── SuperAdminViewAs.tsx   # Impersonation
├── components/
│   ├── ErrorBoundary.tsx          # Crash fallback
│   ├── ssra/
│   │   ├── Header.tsx             # Top navigation
│   │   ├── Footer.tsx             # Page footer
│   │   ├── SsraLogo.tsx           # Logo component
│   │   ├── DashboardLayout.tsx    # Student sidebar layout
│   │   ├── AdminLayout.tsx        # Admin sidebar layout
│   │   └── WhatsAppButton.tsx     # Floating contact button
│   └── ui/                         # 35+ Radix-UI components
│       ├── button.tsx, card.tsx, dialog.tsx
│       ├── form.tsx, input.tsx, select.tsx
│       ├── accordion.tsx, tabs.tsx, pagination.tsx
│       └── ... (accordion, alert, avatar, badge, etc.)
├── hooks/
│   ├── useSsraAuth.ts             # Authentication + role detection
│   ├── useSsraData.ts             # Data fetching (queries + mutations)
│   ├── useReveal.ts               # Intersection observer for animations
│   ├── use-mobile.tsx             # Responsive breakpoint detection
│   └── use-toast.ts               # Toast notifications
├── integrations/supabase/
│   ├── client.ts                  # Supabase client initialization
│   └── types.ts                   # Auto-generated TypeScript types
├── lib/
│   ├── stripe.ts                  # Stripe configuration + course catalog
│   ├── paymob.ts                  # Paymob payment methods (not integrated)
│   ├── exportCsv.ts               # CSV export utility
│   └── utils.ts                   # Common utilities
├── i18n/
│   ├── index.ts                   # i18next configuration
│   └── locales/
│       ├── de.json                # German translations
│       └── en.json                # English translations
├── constants/
│   └── branding.ts                # Branding constants (note: says MASSAVO not SSRA)
├── App.tsx                         # Route configuration + providers
└── main.tsx                        # Entry point

public/
├── robots.txt
├── sitemap.xml
├── _redirects                      # Netlify redirect rules
└── site.webmanifest              # PWA metadata
```

### 1.3 Routing Structure

#### Public Routes (No Auth Required)

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Index | Homepage with hero, features, testimonials |
| `/courses` | Courses | Course catalog with filtering |
| `/pricing` | Pricing | Pricing table with module details |
| `/about` | About | Organization information |
| `/contact` | Contact | Contact form (Resend API) |
| `/legal` | Legal | Terms, privacy, disclaimers |
| `/apply` | Apply | Student verification application |
| `/checkout` | Checkout | Stripe payment gateway |
| `/payment-success` | PaymentSuccess | Confirmation + auto-redirect |
| `/payment-canceled` | PaymentCanceled | Failed payment info |
| `/login` | StudentLogin | OTP email authentication |
| `/reset-password` | ResetPassword | Password recovery |

#### Authenticated Routes (Protected by RequireAuth guard)

| Path | Component | Purpose |
|------|-----------|---------|
| `/dashboard` | StudentDashboard | Overview with stats |
| `/dashboard/courses` | MyCourses | Enrolled courses |
| `/dashboard/sessions` | MySessions | Upcoming Zoom sessions |
| `/dashboard/subscription` | MySubscription | Current subscription info |
| `/dashboard/profile` | MyProfile | Edit profile + preferences |

#### Admin Routes (Protected by RequireAdmin guard)

| Path | Component | Purpose |
|------|-----------|---------|
| `/ssra-admin` | AdminDashboard | Stats + recent activity |
| `/ssra-admin/students` | AdminStudents | Student list + search + export |
| `/ssra-admin/verifications` | AdminVerifications | Application approval queue |
| `/ssra-admin/courses` | AdminCourses | Course CRUD + image upload |
| `/ssra-admin/sessions` | AdminSessions | Zoom class scheduling |
| `/ssra-admin/enrollments` | AdminEnrollments | One-time purchase history |
| `/ssra-admin/attendance` | AdminAttendance | Session attendance tracking |
| `/ssra-admin/revenue` | AdminRevenue | Revenue analytics |

#### Super Admin Routes (Protected by RequireSuperAdmin guard)

| Path | Component | Purpose |
|------|-----------|---------|
| `/ssra-admin/finance` | SuperAdminFinance | Advanced financial reporting |
| `/ssra-admin/admins` | SuperAdminAdmins | Manage admin users |
| `/ssra-admin/activity` | SuperAdminActivity | Audit logs (not implemented) |
| `/ssra-admin/view-as` | SuperAdminViewAs | Impersonate students |

### 1.4 Component Hierarchy

```
App.tsx (Main Router)
├── Auth Guard (RequireAuth, RequireAdmin, RequireSuperAdmin)
├── Layout Providers
│   ├── QueryClientProvider (TanStack React Query)
│   ├── HelmetProvider (React Helmet)
│   ├── TooltipProvider (Radix-UI)
│   └── Sonner.Toaster (Toast notifications)
│
├── Public Layout
│   ├── Header (responsive navbar)
│   ├── Page Content
│   └── Footer
│
├── Student Dashboard Layout
│   ├── Sidebar Navigation (dark)
│   ├── Top Bar
│   └── Content Area
│
└── Admin Dashboard Layout
    ├── Collapsible Sidebar (dark with accent)
    └── Content Area
```

### 1.5 State Management Strategy

#### Global Auth State (useSsraAuth)
```typescript
interface AuthState {
  user: User | null;                    // Supabase Auth user
  session: Session | null;              // JWT session
  profile: SsraProfile | null;          // Database profile
  loading: boolean;
  isAdmin: boolean;                     // Computed from role
  isSuperAdmin: boolean;                // Computed from role
}
```

#### Data Fetching (TanStack React Query)
- **useQuery**: Read-only data fetching with caching
- **useMutation**: Write operations with optimistic updates
- **Invalidation**: Query keys invalidated on mutation success
- **Cache Configuration**:
  - staleTime: 60 seconds
  - gcTime (formerly cacheTime): 300 seconds
  - refetchOnWindowFocus: false
  - retry: 1

#### Query Key Hierarchy
```
"ssra-enrollments-me"
"ssra-subscription-me"
"ssra-verification-me"
"ssra-profile-me"
"ssra-admin-students" + search
"ssra-admin-verifications" + status
"ssra-admin-enrollments"
"ssra-admin-courses"
"ssra-admin-sessions"
"ssra-sessions-upcoming"
"ssra-sessions-past"
```

#### Local Storage
- **i18nextLng**: Current language preference
- **utm_source, utm_medium, utm_campaign, utm_content**: UTM tracking from social media

### 1.6 Styling Architecture

#### Tailwind CSS
- Custom theme colors defined in tailwind.config.ts
- Hero gradient: `from-blue-600 to-slate-900`
- Primary blue: `hsl(220,91%,54%)`
- Accent gold: `hsl(43,96%,50%)`

#### Radix-UI
- Unstyled components with Tailwind styling
- Composable component APIs
- Accessibility built-in (WCAG 2.1 AA)

#### Component Styling Pattern
```typescript
// Example from button.tsx
<button className={`
  inline-flex items-center justify-center
  px-4 py-2 rounded-lg
  font-medium text-sm
  transition-colors
  ${variant === 'primary' ? 'bg-blue-600 text-white' : '...'}
  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
`} />
```

#### Responsive Breakpoints
```
Mobile: 0px
Tablet: 640px (sm)
Desktop: 768px (md)
Large: 1024px (lg)
```

### 1.7 Forms & Validation

#### React Hook Form Integration
- Minimal re-renders via field-level subscriptions
- Native HTML form submission
- Zod schema validation
- Example: Apply.tsx form
  ```typescript
  const form = {
    fullName, email, country, degree,
    graduationYear, germanLevel, course, motivation
  }
  ```

#### Validation Rules
- Apply form: motivation ≥ 50 characters
- Contact form: email regex, max lengths
- Checkout: Required fields before payment

### 1.8 Internationalization (i18n)

#### Languages
- **German (de)**: Default language
- **English (en)**: Secondary

#### Implementation
```typescript
// i18n/index.ts
import de from './locales/de.json';
import en from './locales/en.json';

// Language detection order: localStorage > browser > default (de)
// Stored in localStorage as 'i18nextLng'
```

#### Usage in Components
```typescript
const { t } = useTranslation();
// Usage: t('key.path')
```

#### Applied To
- Contact form (labels, placeholders)
- Admin interface (some labels)
- Dynamic content messaging

### 1.9 Code Splitting & Performance

#### Lazy Route Loading
```typescript
// App.tsx
const Courses = lazy(() => import("./pages/Courses"));
const Checkout = lazy(() => import("./pages/Checkout"));
// ... all admin pages lazy loaded

// Wrapped in Suspense with spinner
<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/courses" element={<Courses />} />
  </Routes>
</Suspense>
```

#### Vite Build Optimization
```javascript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      "react-vendor": ["react", "react-dom", "react-router-dom"],
      "query-vendor": ["@tanstack/react-query"],
      "supabase-vendor": ["@supabase/supabase-js"],
      "ui-vendor": ["lucide-react"],
      "recharts-vendor": ["recharts"],
      "i18n-vendor": ["i18next", "react-i18next"],
    }
  }
}
```

### 1.10 Error Handling

#### Error Boundary
- ErrorBoundary.tsx component wraps entire app
- Catches React component errors
- Displays fallback UI

#### Network Errors
- Try-catch blocks in async functions
- Toast notifications for user feedback
- Server-side validation error messages

### 1.11 Build Configuration

| Config File | Purpose |
|-------------|---------|
| vite.config.ts | Build tool configuration |
| tsconfig.json | TypeScript compiler options |
| tsconfig.app.json | App-specific TS settings |
| tailwind.config.ts | Tailwind customization |
| postcss.config.js | CSS processing |

---

## 2. BACKEND ARCHITECTURE

### 2.1 Supabase Infrastructure

#### Services Used
1. **PostgreSQL Database**: Core data store with RLS
2. **Auth**: Supabase Auth with OTP email verification
3. **Edge Functions**: Deno serverless for Stripe webhooks + email
4. **Storage**: S3-compatible for course images
5. **Realtime**: PostgreSQL subscriptions (not currently used)

#### Environment Configuration
```
VITE_SUPABASE_URL = https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = [anon key]
```

### 2.2 Supabase Functions (Edge Functions)

#### 2.2.1 create-checkout-session

**Purpose**: Create Stripe checkout sessions for both one-time and subscription courses

**Trigger**: Frontend POST request from Checkout.tsx

**Parameters**:
```typescript
{
  priceId: string;              // Stripe Price ID
  mode: "payment" | "subscription";
  customerEmail: string;        // Student email
  successUrl: string;           // Redirect after success
  cancelUrl: string;            // Redirect after cancellation
  metadata: Record<string, string>;  // courseId, courseName, etc.
}
```

**Flow**:
1. Validates Authorization header
2. Gets current user from Supabase Auth
3. Creates Stripe checkout session
4. Stores userId in metadata
5. Returns session URL + session ID

**Response**:
```typescript
{ url: string; id: string; }  // Stripe checkout URL
```

#### 2.2.2 stripe-webhook

**Purpose**: Handle Stripe webhook events (payment completion, subscription changes)

**Events Handled**:
- `checkout.session.completed` - One-time or subscription payment
- `customer.subscription.updated` - Subscription status change
- `customer.subscription.deleted` - Subscription cancellation

**Flow for One-Time Payment**:
1. Extract courseId from session metadata
2. Resolve userId (from metadata or email lookup)
3. Create/upsert ssra_enrollments row
4. Set status = "active", amount_eur from Stripe

**Flow for Subscription**:
1. Extract courseId from session metadata
2. Create/upsert ssra_subscriptions row
3. Store stripe_subscription_id
4. Set status = "active"
5. Store current_period_end

**Security**: Uses STRIPE_WEBHOOK_SECRET to verify signature

#### 2.2.3 send-application-email

**Purpose**: Send confirmation email when student applies for verification

**Trigger**: Frontend POST request from Apply.tsx

**Parameters**:
```typescript
{
  fullName: string;
  email: string;
  country: string;
  degree: string;
  germanLevel: string;
  courseId: string;
  motivation: string;
}
```

**Email Recipients**:
1. **Student (applicant)**: Confirmation + application summary (English/Arabic)
2. **Admin (info@ssra-academy.de)**: Full details + motivation for review

**Template Features**:
- HTML-based with branded styling
- HTML sanitization to prevent XSS
- COURSE_NAMES mapping for course titles
- Structured detail tables

**Errors**: Non-blocking for admin email; blocks if student email fails

#### 2.2.4 send-contact-email

**Purpose**: Handle contact form submissions

**Trigger**: Frontend POST request from Contact.tsx

**Parameters**:
```typescript
{
  name: string;
  email: string;
  subject: string;
  message: string;
}
```

**Validation**:
- Name: required, ≤100 chars
- Email: required, valid format, ≤255 chars
- Subject: required, ≤200 chars
- Message: required, ≤5000 chars

**Processing**:
1. Validates input with detailed error messages
2. Sanitizes HTML special characters
3. Sends to info@ssra-academy.de
4. Sets reply-to to user's email
5. Auto-sends confirmation to user

#### 2.2.5 create-portal-session

**Purpose**: Create Stripe customer portal session for subscription management

**Status**: Function defined, not integrated into UI yet

### 2.3 Authentication & Authorization

#### Flow
1. **User OTP Request**: StudentLogin.tsx → supabase.auth.signInWithOtp()
2. **Email Delivery**: Supabase sends 6-digit code
3. **User Verifies**: Code entered → supabase.auth.verifyOtp()
4. **Session Created**: JWT token stored in localStorage
5. **Profile Sync**: useSsraAuth hook fetches ssra_profiles
6. **Auto Trigger**: Database trigger creates profile on auth.users insert

#### Role-Based Access Control (RBAC)

Roles stored in `ssra_profiles.role`:
- **student**: Default role, no admin access
- **admin**: Access to /ssra-admin routes
- **super_admin**: Access to finance, admin management, activity logs

#### Row-Level Security (RLS) Policies

**ssra_profiles**:
```sql
-- Users can only read/update their own profile
SELECT: auth.uid() = id
UPDATE: auth.uid() = id

-- Admins can read all profiles
SELECT: EXISTS (SELECT 1 FROM ssra_profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))

-- Admins can update any profile (for role assignment)
UPDATE: EXISTS (similar admin check)
```

**ssra_enrollments**:
```sql
-- Users can only insert/update their own enrollments
INSERT: auth.uid() = user_id
UPDATE: auth.uid() = user_id
SELECT: auth.uid() = user_id

-- Admins can read all
SELECT: (admin check)
```

**ssra_subscriptions**:
```sql
-- Users can only read their own
SELECT: auth.uid() = user_id

-- Cannot insert/update/delete via API (webhook only uses service_role)

-- Admins can manage all
SELECT/UPDATE/INSERT/DELETE: (admin check)
```

**ssra_verifications**:
```sql
-- Users can insert their own and read own
INSERT: auth.uid() = user_id
SELECT: auth.uid() = user_id

-- Admins manage all
SELECT/UPDATE/DELETE: (admin check)
```

**ssra_sessions**:
```sql
-- Admins can do everything

-- Active subscribers can read sessions for their course
SELECT: EXISTS (
  SELECT 1 FROM ssra_subscriptions
  WHERE user_id = auth.uid()
    AND course_id = ssra_sessions.course_id
    AND status IN ('active', 'trialing')
)
```

### 2.4 Database Schema

#### 2.4.1 Core Tables

**auth.users** (Supabase managed)
- id (uuid) [PK]
- email (unique)
- encrypted_password
- raw_user_meta_data (jsonb) - stores full_name on signup
- created_at, updated_at

**ssra_profiles** (extends auth.users)
```sql
CREATE TABLE ssra_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  country text,
  degree text,
  german_level text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
- **Unique Index**: ssra_profiles_email_unique (lowercased email)
- **Purpose**: Extends Supabase auth with application-specific fields
- **Trigger**: Auto-created when auth.users inserted

**ssra_courses** (Course Catalog)
```sql
CREATE TABLE ssra_courses (
  id text PRIMARY KEY,  -- e.g., "medical-german"
  title text NOT NULL,
  title_ar text,
  subtitle text,
  description text,
  price_eur numeric(10,2) NOT NULL,
  price_egp numeric(10,2),  -- EGP conversion (1 EUR ≈ 55 EGP)
  stripe_price_id text,
  course_type text NOT NULL
    CHECK (course_type IN ('one_time', 'subscription')),
  category text NOT NULL
    CHECK (category IN ('clinical', 'language', 'career')),
  requires_verification boolean NOT NULL DEFAULT false,
  duration_weeks text,
  level text,
  image_url text,
  modules jsonb DEFAULT '[]'::jsonb,  -- Array of module names
  price_hidden boolean NOT NULL DEFAULT false,  -- Hide on public pages
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**ssra_enrollments** (One-Time Course Purchases)
```sql
CREATE TABLE ssra_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text REFERENCES ssra_courses(id),
  stripe_session_id text,
  stripe_payment_intent text,
  amount_eur numeric(10,2),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'refunded')),
  enrolled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);
```
- **Indexes**: user_id, course_id, status
- **Purpose**: Track one-time course purchases
- **Created By**: Stripe webhook on checkout.session.completed

**ssra_subscriptions** (Recurring Courses)
```sql
CREATE TABLE ssra_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text REFERENCES ssra_courses(id),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```
- **Indexes**: user_id, stripe_subscription_id
- **Purpose**: Track recurring subscriptions
- **Updated By**: Stripe webhook on subscription events

**ssra_verifications** (Student Applications)
```sql
CREATE TABLE ssra_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  country text,
  degree text,
  graduation_year text,
  german_level text,
  motivation text,
  course_id text REFERENCES ssra_courses(id),
  diploma_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);
```
- **Indexes**: user_id, status
- **Purpose**: Track student applications for verification-required courses
- **Created By**: Apply.tsx form submission

**ssra_sessions** (Zoom Live Classes)
```sql
CREATE TABLE ssra_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text REFERENCES ssra_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  zoom_link text NOT NULL,
  zoom_password text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  recording_url text,
  is_cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- **Indexes**: scheduled_at, course_id
- **Purpose**: Schedule and track live Zoom sessions
- **Created By**: Admin via /ssra-admin/sessions

**ssra_session_attendance** (Attendance Tracking)
```sql
CREATE TABLE ssra_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ssra_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);
```
- **Purpose**: Track which students attended which sessions
- **RLS**: Admins can manage, students can view own attendance

#### 2.4.2 Views

**ssra_revenue_summary**
```sql
SELECT
  date_trunc('month', enrolled_at)::date as month,
  count(*) as enrollment_count,
  sum(amount_eur) as revenue_eur
FROM ssra_enrollments
WHERE status = 'active'
GROUP BY 1
ORDER BY 1 DESC;
```
- **Purpose**: Monthly revenue aggregation for analytics
- **Used By**: AdminDashboard, SuperAdminFinance

### 2.5 Database Migrations

| Migration | Purpose | Key Changes |
|-----------|---------|-------------|
| 20260527100000_ssra_academy_schema.sql | Initial schema | Create all tables, RLS, auto-profile trigger |
| 20260527120000_ssra_courses_images_egp.sql | Add images + EGP | image_url, price_egp, modules columns; Storage bucket |
| 20260527130000_ssra_sessions.sql | Zoom sessions | ssra_sessions + RLS policies |
| 20260531000000_ssra_courses_price_hidden.sql | Hidden pricing | price_hidden column for "Coming Soon" courses |
| 20260531010000_ssra_session_attendance.sql | Attendance | ssra_session_attendance table |
| 20260602000000_fix_security_issues.sql | Security fixes | Fixed RLS policies, unique email index, type fixes |

### 2.6 Indexes for Performance

```sql
ssra_enrollments_user_idx    -- Filter by user
ssra_enrollments_course_idx  -- Filter by course
ssra_enrollments_status_idx  -- Filter by status
ssra_subs_user_idx           -- Filter by user
ssra_subs_stripe_idx         -- Lookup by Stripe ID
ssra_verif_user_idx          -- Filter by user
ssra_verif_status_idx        -- Filter by status
ssra_sessions_scheduled_at   -- Sort upcoming sessions
ssra_sessions_course_id      -- Filter by course
ssra_profiles_email_unique   -- Unique email constraint
```

---

## 3. PAYMENT SYSTEMS

### 3.1 Stripe Integration

#### Configuration

**Environment Variables** (Frontend):
```
VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
```

**Supabase Edge Function Secrets**:
```
STRIPE_SECRET_KEY = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
```

#### Course Pricing

| Course | Price (EUR) | Type | Requires Verification |
|--------|-------------|------|----------------------|
| Medical German | 29 | Subscription | Yes |
| Sport Rehab Basics | 49 | One-time | No |
| Bewegungsanalyse | 59 | One-time | No |
| Sporttherapie Praxis | 79 | One-time | No |
| Anatomie für Sport-Reha | 39 | One-time | No |
| Therapeutisches Training | 55 | One-time | No |
| Telefonkommunikation | 29 | One-time | No |
| Berufseinstieg | 49 | One-time | No |
| DOSB-Lizenz Vorbereitung | 69 | One-time | No |

#### 3.1.1 One-Time Payment Flow

```
User → /checkout?courseId=X
  ↓
Checkout.tsx loads course details, auto-fills email
  ↓
User clicks "Pay"
  ↓
create-checkout-session function
  ↓
Stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: priceId, quantity: 1 }],
  metadata: { courseId, userId, ... }
})
  ↓
User redirected to Stripe Checkout
  ↓
User enters card details
  ↓
Payment processed
  ↓
Stripe fires checkout.session.completed webhook
  ↓
stripe-webhook function:
  - Resolves userId from metadata or email lookup
  - Upserts ssra_enrollments { user_id, course_id, status: 'active', amount_eur }
  ↓
User redirected to /payment-success
  ↓
Auto-redirect to /dashboard after 6 seconds
```

**Success Indicators**:
- Course appears in /dashboard/courses
- ssra_enrollments.status = 'active'

#### 3.1.2 Subscription Payment Flow

```
User → /checkout?courseId=medical-german
  ↓
Checkout.tsx detects subscription course
  ↓
User clicks "Subscribe"
  ↓
create-checkout-session function
  ↓
Stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: { metadata: { userId, ... } }
})
  ↓
User enters billing details (auto-save for future)
  ↓
Initial payment + subscription created
  ↓
Stripe fires checkout.session.completed webhook
  ↓
stripe-webhook function:
  - Upserts ssra_subscriptions
  - Sets status: 'active'
  - Stores stripe_subscription_id + stripe_customer_id
  ↓
/payment-success displays subscription info
  ↓
Auto-redirect to /dashboard/subscription
```

**Recurring Charges**:
- Monthly on same date
- Stripe handles retries for failed payments
- Webhook updates status if past_due, canceled, etc.

#### 3.1.3 Webhook Event Processing

**checkout.session.completed**:
- If mode='payment': Insert/upsert ssra_enrollments
- If mode='subscription': Insert/upsert ssra_subscriptions

**customer.subscription.updated**:
- Updates ssra_subscriptions.status and current_period_end

**customer.subscription.deleted**:
- Updates ssra_subscriptions.status to 'canceled'

### 3.2 Paymob Integration

#### Configuration

Defined in `src/lib/paymob.ts`:

```typescript
export const PAYMOB_METHODS: PaymobMethodConfig[] = [
  { id: "card",           label: "Visa / Mastercard", ... },
  { id: "fawry",          label: "Fawry", ... },
  { id: "vodafone_cash",  label: "Vodafone Cash", ... },
  { id: "orange_money",   label: "Orange Money", ... },
];

export function egpLabel(priceEgp: number): string {
  return `${priceEgp.toLocaleString("ar-EG")} ج.م`;
}
```

#### Status
**Not integrated into checkout flow yet**. The configuration exists but Paymob payment is not wired to the Checkout page.

### 3.3 Payment Method Selection

Currently **Stripe only** via card payment method in Checkout page. Stripe checkout supports:
- Visa, Mastercard, Amex
- Apple Pay, Google Pay
- iDEAL, SEPA, Bancontact (region-specific)

---

## 4. AUTHENTICATION & AUTHORIZATION

### 4.1 Authentication Flow

#### Sign Up
1. User visits `/login` page
2. Selects "Sign up" tab
3. Enters email and full name
4. Clicks "Send Code"
5. `supabase.auth.signInWithOtp({ email, shouldCreateUser: true, data: { full_name } })`
6. Supabase sends 6-digit OTP email
7. User enters code
8. `supabase.auth.verifyOtp({ email, token, type: 'email' })`
9. Supabase creates auth.users row
10. Trigger creates ssra_profiles row automatically
11. Session established, user redirected to /dashboard

#### Sign In
1. User visits `/login` page
2. Selects "Sign in" tab (default)
3. Enters email
4. Clicks "Send Code"
5. `supabase.auth.signInWithOtp({ email, shouldCreateUser: false })`
6. Supabase sends 6-digit OTP if account exists
7. Error if account doesn't exist
8. User enters code
9. Session established, redirected to /dashboard

#### Sign Out
1. User clicks "Sign Out" button
2. `supabase.auth.signOut()`
3. Redirected to `/login`

### 4.2 Authorization (useSsraAuth Hook)

```typescript
export function useSsraAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, session: Session) {
    const { data: profile } = await supabase
      .from("ssra_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setState({
      user: session.user,
      session,
      profile: profile as SsraProfile | null,
      loading: false,
      isAdmin: profile?.role === "admin" || profile?.role === "super_admin",
      isSuperAdmin: profile?.role === "super_admin",
    });
  }

  return state;
}
```

### 4.3 Route Protection

#### RequireAuth Guard (for student dashboard)
```typescript
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSsraAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
```

#### RequireAdmin Guard (for admin dashboard)
```typescript
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useSsraAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
```

#### RequireSuperAdmin Guard (for super admin features)
```typescript
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, loading } = useSsraAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?redirect=${...}` /> replace />;
  if (!isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  return <>{children}</>;
}
```

### 4.4 Session Management

**Persistence**: localStorage
**Auto-Refresh**: Supabase auto-refreshes tokens
**Logout**: Clears session + redirects to login
**Redirect**: Preserves original URL on login via `?redirect=` param

---

## 5. ENROLLMENT & COURSE ACCESS WORKFLOW

### 5.1 Complete Student Journey

#### Path 1: Direct Purchase (No Verification Required)

```
1. Browse /courses
2. Select course (e.g., "Sport Rehab Basics")
3. Click "Enroll" button
4. Redirected to /checkout?courseId=sport-rehab-basics
5. If not logged in: Redirected to /login?redirect=/checkout?...
6. If logged in: Checkout page auto-fills email + name
7. User clicks "Pay"
8. Redirected to Stripe Checkout
9. User enters card details
10. Stripe confirms payment
11. Webhook creates ssra_enrollments row { status: 'active' }
12. Redirected to /payment-success?courseId=...
13. Auto-redirects to /dashboard/courses
14. Course now visible in "My Courses" list
```

**SSR PROFILE OPTIONAL**: User can checkout without completing profile

#### Path 2: Verification-Gated Purchase (Medical German)

```
1. Browse /courses
2. Find "Medical German" subscription
3. Click "Enroll"
4. Redirected to /apply?course=medical-german&intent=subscribe
5. Fills verification form: name, email, country, degree, german_level, motivation
6. Motivation must be ≥50 characters
7. Submit → Creates ssra_verifications row { status: 'pending', course_id: 'medical-german' }
8. Calls send-application-email function
9. Admin receives email with application
10. Student receives confirmation email
11. Admin reviews in /ssra-admin/verifications
12. Admin clicks "Approve" and provides notes
13. ssra_verifications updated { status: 'approved', reviewed_by, reviewed_at }
14. Student receives approval email (TODO: not implemented)
15. Student can now /checkout?courseId=medical-german
16. Completes payment
17. ssra_subscriptions created { status: 'active' }
18. Subscription appears in /dashboard/subscription
```

### 5.2 Enrollment Data Model

**ssra_enrollments** (one-time purchases):
- user_id: Student who purchased
- course_id: Course purchased
- status: pending → active (or refunded)
- amount_eur: What they paid
- stripe_payment_intent, stripe_session_id: Payment references
- enrolled_at: When they got access

**ssra_subscriptions** (recurring):
- user_id: Subscriber
- course_id: Subscribed course
- status: active, past_due, canceled, etc.
- stripe_subscription_id: Stripe reference
- current_period_start, current_period_end: Billing cycle
- cancel_at_period_end: Pending cancellation flag

### 5.3 Course Access Control

**Frontend**:
- MyCourses page queries ssra_enrollments with status='active'
- Displays enrolled courses with course details

**Backend** (RLS):
- Users can only see their own enrollments
- Admins can see all enrollments
- No explicit access control (honor system for content)

---

## 6. ADMIN & SUPER ADMIN FEATURES

### 6.1 Admin Dashboard Overview

**URL**: `/ssra-admin`

**Stats Displayed**:
- Total students
- Total applications (pending)
- Total revenue (monthly aggregate)
- Total enrollments
- Upcoming sessions

**Charts**:
- Student growth over time (monthly)
- Revenue growth over time (monthly)
- Verification status distribution (pie chart)

**Tables**:
- Recent verifications
- Recent enrollments
- Upcoming Zoom sessions

### 6.2 Student Management

**URL**: `/ssra-admin/students`

**Features**:
- Search by name/email (ilike query)
- Filter by subscription status: All, Active, None
- Export CSV with columns:
  - Full Name, Email, Country, Degree, Subscription, Enrollments, Joined Date
- Inline stats: Total students matching filter

**Data Fetched**:
```typescript
supabase
  .from("ssra_profiles")
  .select("*, ssra_enrollments(count), ssra_subscriptions(status)")
  .eq("role", "student")
  .order("created_at", { ascending: false })
```

### 6.3 Verification Queue

**URL**: `/ssra-admin/verifications`

**Features**:
- Filter by status: All, Pending, Approved, Rejected
- Search by name/email
- Expand rows to view full application
- Approve or Reject with optional notes
- Export CSV

**Workflow**:
1. Admin clicks "Approve"
2. Sets status='approved', reviewed_by=admin_id, reviewed_at=now
3. Sends confirmation email to student (TODO)
4. Student gains access to subscribe

### 6.4 Course Management

**URL**: `/ssra-admin/courses`

**Features**:
- List all courses
- Create new course
- Edit course (modal form)
- Toggle active/inactive (visibility)
- Toggle price_hidden (show "Coming Soon")
- Upload course image to Supabase Storage
- Edit all course metadata: title, price, category, level, modules, etc.
- Reorder courses via sort_order field

**Image Storage**:
- Bucket: `ssra-course-images`
- Public read access
- Admin-only upload/delete
- Images saved as `courses/{timestamp}.{ext}`

### 6.5 Zoom Session Management

**URL**: `/ssra-admin/sessions`

**Features**:
- Create new session with course selection
- Edit session details (date, zoom link, etc.)
- Delete session with confirmation
- Automatic sorting: Upcoming vs. Past
- Stats: # upcoming, # past, total

**Session Fields**:
- course_id (required): Which course
- title (required): Session name
- description: Optional notes
- zoom_link (required): Meeting URL
- zoom_password: Optional meeting password
- scheduled_at (required): Date + time picker
- duration_minutes: Length in minutes
- recording_url: Video link after recording
- is_cancelled: Mark as canceled

### 6.6 Enrollment History

**URL**: `/ssra-admin/enrollments`

**Features**:
- View all one-time course purchases
- Read-only table
- Columns: Student, Course, Amount (EUR), Status, Date
- No edit/delete (data locked after payment)

### 6.7 Session Attendance Tracking

**URL**: `/ssra-admin/attendance`

**Features**:
- Track which students attended which sessions
- Manual admin entry (no auto-detection)
- Records stored in ssra_session_attendance table

### 6.8 Super Admin Features

**Super Admin Queries**:
```typescript
export function useAdminStats() {
  // Total students, applications, revenue, enrollments, sessions
}

export function useStudentGrowth() {
  // Monthly student count trend
}

export function useRevenueGrowth() {
  // Monthly revenue trend (from ssra_revenue_summary view)
}
```

#### Finance Dashboard (/ssra-admin/finance)

**Purpose**: Advanced financial reporting
**Data**: Revenue trends, breakdown by course, customer acquisition cost

#### Admin Management (/ssra-admin/admins)

**Purpose**: Create/remove admin users
**Features**: Assign admin or super_admin roles

#### Activity Monitor (/ssra-admin/activity)

**Purpose**: Audit log viewer
**Status**: Page exists but admin_audit_log table not populated

#### View As (/ssra-admin/view-as)

**Purpose**: Impersonate student to test experience
**Use Case**: Support/troubleshooting

---

## 7. EMAIL SYSTEM

### 7.1 Email Delivery Service (Resend)

**Provider**: Resend API (https://resend.com)
**Auth**: Bearer token in RESEND_API_KEY environment variable
**Sender**: SSRA Academy <noreply@ssra-academy.de>

### 7.2 Email Types

#### 7.2.1 Application Confirmation Email

**Trigger**: Apply.tsx form submission → send-application-email function

**Recipient**: Applicant (student's email)

**Subject**: "Application Received — SSRA Academy"

**Content** (in both German and English):
- Greeting in Arabic + English
- Application summary table: Name, Email, Country, Degree, German Level, Course Interest
- Reassurance message (review within 3-5 days)
- Contact info for questions

#### 7.2.2 Admin Notification Email

**Trigger**: Same as above (non-blocking)

**Recipient**: info@ssra-academy.de

**Subject**: "New Application: {Name} ({Country})"

**Content**:
- Applicant details table
- Full motivation text (displayed in monospace box)
- Link to /ssra-admin/verifications for review
- Custom admin notes section

#### 7.2.3 Contact Form Email

**Trigger**: Contact.tsx form submission → send-contact-email function

**Recipient**: info@ssra-academy.de

**Subject**: "Kontaktformular: {User Subject}"

**Content**:
- Sender info (Name, Email, Subject)
- Full message in monospace box
- Reply-to set to user's email

#### 7.2.4 Approval/Rejection Email (TODO)

**Not Yet Implemented**

**Planned**:
- Sent when admin approves/rejects verification
- Approval: "Your application was approved! Proceed to checkout for Medical German subscription"
- Rejection: "Your application was reviewed. {Admin notes}"

### 7.3 Email Template System

**Components** (in supabase/functions/_shared/email-template.ts):
```typescript
emailLayout(content)          // HTML wrapper
emailHeading(text)            // H1 styled heading
emailSubheading(text)         // H2 styled heading
emailParagraph(text)          // Paragraph
emailDetailRow(label, value)  // Key-value pair
emailDetailTable(rows)        // Table of key-value pairs
emailNotice(text)             // Callout/notice box
emailSignature()              // Footer signature
```

**Styling**:
- Inline CSS (email client compatibility)
- SSRA branding colors
- Responsive layout
- HTML sanitization to prevent XSS

### 7.4 Validation & Error Handling

**Contact Form Validation**:
```
name: Required, ≤100 chars
email: Required, valid format, ≤255 chars
subject: Required, ≤200 chars
message: Required, ≤5000 chars
```

**Error Messages**:
- Clear, user-friendly error descriptions
- Prevents over-validation errors (generic fallback)
- Non-blocking admin email (doesn't block user if admin email fails)

---

## 8. COURSE STRUCTURE & CONTENT

### 8.1 Course Catalog (9 Total)

All courses seeded in database migration:

```
1. medical-german (Language - Subscription)
   Price: €29/month
   Verification: Required
   Modules: Body vocabulary, clinic conversations, reports, patient scripts, B1 exam prep
   Duration: Ongoing
   Level: A0 → B1

2. sport-rehab-basics (Clinical - One-time)
   Price: €49
   Verification: No
   Duration: 8 weeks
   Level: Beginner

3. bewegungsanalyse (Clinical - One-time)
   Price: €59
   Verification: No
   Duration: 6 weeks
   Level: Intermediate

4. sporttherapie-praxis (Clinical - One-time)
   Price: €79
   Verification: No
   Duration: 10 weeks
   Level: Intermediate

5. anatomie-rehab (Clinical - One-time)
   Price: €39
   Verification: No
   Duration: 5 weeks
   Level: Beginner

6. therapeutisches-training (Clinical - One-time)
   Price: €55
   Verification: No
   Duration: 7 weeks
   Level: Intermediate

7. telefonkommunikation (Language - One-time)
   Price: €29
   Verification: No
   Duration: 4 weeks
   Level: A2+

8. berufseinstieg (Career - One-time)
   Price: €49
   Verification: No
   Duration: 6 weeks
   Level: All levels

9. dosb-vorbereitung (Career - One-time)
   Price: €69
   Verification: No
   Duration: 8 weeks
   Level: Advanced
```

### 8.2 Course Data Structure

```typescript
interface Course {
  id: string;                    // Unique identifier
  title: string;                 // German name
  titleAr: string;              // Arabic name
  subtitle: string;             // Short description
  description: string;          // Long description
  price_eur: number;            // Price in EUR
  price_egp?: number;           // Price in EGP (optional)
  stripe_price_id: string;      // Stripe Price ID
  course_type: "one_time" | "subscription";
  category: "clinical" | "language" | "career";
  requires_verification: boolean;
  duration_weeks: string;       // e.g., "8 weeks" or "Ongoing"
  level: string;                // Difficulty level
  image_url?: string;           // Course image URL
  modules: string[];            // Array of module names
  price_hidden: boolean;        // Hide price (show "Coming Soon")
  is_active: boolean;           // Listed in catalog
  sort_order: number;           // Display order
}
```

### 8.3 EGP Pricing

Stored in database with conversion formula:
- 1 EUR ≈ 55 EGP
- Admin can manually adjust prices

Example:
- Medical German: €29 → 1,595 ج.م

---

## 9. DATA MODELS & RELATIONSHIPS

### 9.1 Entity Relationship Diagram

```
┌─────────────────────┐
│    auth.users       │
│  (Supabase Auth)    │
│                     │
│ id (uuid) [PK]      │
│ email               │
│ created_at          │
└──────────┬──────────┘
           │ 1:1
           │
┌──────────▼──────────────┐
│  ssra_profiles          │
│                         │
│ id (uuid) [PK, FK]      │
│ full_name               │
│ email                   │
│ country, degree         │
│ german_level            │
│ role (student|admin)    │
│ created_at, updated_at  │
└──┬────────┬────────┬────┘
   │        │        │
   │ 1:N    │ 1:N    │ 1:N
   │        │        │
   │   ┌────▼──────────────┐
   │   │ssra_enrollments    │
   │   │(one-time buys)     │
   │   │user_id → [PK,FK]   │
   │   │course_id → [FK]    │
   │   │status, amount_eur  │
   │   │enrolled_at         │
   │   └────┬───────────────┘
   │        │ ← 1:N
   │        │
   │   ┌────▼──────────────┐
   ├──▶│ssra_subscriptions  │
   │   │(recurring courses) │
   │   │user_id → [PK,FK]   │
   │   │course_id → [FK]    │
   │   │status, current_per │
   │   │period_end          │
   │   │cancel_at_period_end
   │   └────────────────────┘
   │
   │   ┌────────────────────┐
   ├──▶│ssra_verifications  │
   │   │(applications)      │
   │   │user_id → [FK]      │
   │   │course_id → [FK]    │
   │   │status, motivation  │
   │   │reviewed_by, notes  │
   │   └────────────────────┘
   │
   │   ┌────────────────────┐
   └──▶│ssra_session_       │
       │attendance          │
       │user_id → [FK]      │
       │session_id → [FK]   │
       │attended_at         │
       └────────────────────┘

┌──────────────────────┐
│   ssra_courses       │ ◀──── Many rows reference this
│ (Course Catalog)     │
│                      │
│ id (text) [PK]       │
│ title, title_ar      │
│ price_eur, price_egp │
│ stripe_price_id      │
│ course_type          │
│ category             │
│ requires_verification│
│ modules (jsonb)      │
│ image_url            │
│ price_hidden         │
│ is_active            │
│ sort_order           │
│ created_at, updated_at
└──────────┬───────────┘
           │ 1:N
           │
┌──────────▼──────────┐
│ ssra_sessions       │
│ (Zoom sessions)     │
│                     │
│ id (uuid) [PK]      │
│ course_id [FK]      │
│ title               │
│ zoom_link           │
│ zoom_password       │
│ scheduled_at        │
│ duration_minutes    │
│ recording_url       │
│ is_cancelled        │
└─────────────────────┘
```

### 9.2 Key Data Flows

**User Registration**:
```
User submits email/name → Supabase Auth creates auth.users
  → Database trigger fires → Automatically creates ssra_profiles row
  → User fully onboarded
```

**Course Purchase (One-Time)**:
```
User → /checkout → create-checkout-session
  → Stripe.checkout.sessions.create()
  → User pays on Stripe
  → Stripe webhook: checkout.session.completed
  → stripe-webhook function
  → ssra_enrollments.upsert({ user_id, course_id, status: 'active' })
  → User can access course
```

**Subscription Purchase**:
```
Similar to above, but creates ssra_subscriptions row
  → Stripe auto-charges monthly
  → Webhook updates status on each event
  → User can access course until canceled
```

**Student Application**:
```
User → /apply → Fills form
  → ssra_verifications.insert({ status: 'pending' })
  → send-application-email function
  → Admin notified, user notified
  → Admin reviews → Approves/Rejects
  → ssra_verifications.update({ status: 'approved'/'rejected' })
  → User can proceed to purchase (if approved)
```

---

## 10. DEPLOYMENT & INFRASTRUCTURE

### 10.1 Hosting Platforms

**Primary**: Vercel (vercel.json configured)
**Alternative**: Netlify (netlify.toml configured)

### 10.2 Build & Deployment

```bash
npm run build      # Vite production build
npm run preview    # Local production preview

# Build outputs:
dist/               # Optimized production bundle
  └── index.html
  └── assets/
      ├── react-vendor-*.js
      ├── query-vendor-*.js
      ├── supabase-vendor-*.js
      └── ... (other chunks)
```

### 10.3 Environment Variables

**Frontend (.env.local)**:
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_GERMAN_SUB=price_...
VITE_STRIPE_PRICE_REHAB=price_...
... (9 price IDs total)
```

**Supabase Edge Function Secrets**:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

### 10.4 Redirect Rules (Netlify)

```
/* /index.html 200
```

This serves index.html for all non-matching routes (SPA behavior).

---

## 11. SECURITY CONSIDERATIONS

### 11.1 Authentication Security

✓ **OTP via Email**: No password storage, one-time codes
✓ **JWT Tokens**: Supabase-issued, auto-refresh
✓ **Session Persistence**: localStorage (secure enough for first-party cookies)
✓ **CORS Headers**: Properly configured in Edge Functions

### 11.2 Row-Level Security (RLS)

✓ **User Isolation**: RLS policies enforce user can only see own data
✓ **Admin Access**: RLS policies allow admin role access
✓ **Webhook Service Role**: Bypasses RLS for payment updates
✓ **Email Uniqueness**: Unique index prevents duplicate profiles

### 11.3 Payment Security

✓ **Stripe Webhook Signature Verification**: STRIPE_WEBHOOK_SECRET validated
✓ **Stripe PCI Compliance**: No card data touches our servers
✓ **Metadata Validation**: User ID in checkout metadata verified

### 11.4 Email Security

✓ **HTML Sanitization**: Special characters escaped in emails (prevent HTML injection)
✓ **Input Validation**: Contact form validates length + format
✓ **Rate Limiting**: Not explicitly implemented (should be added)

### 11.5 Known Issues

⚠ **localStorage UTM Tracking**: UTM params stored in sessionStorage (accessible to XSS)
⚠ **Redirect Parameter**: `?redirect=` param could be vulnerable to open redirect (should validate origin)
⚠ **No CSRF Protection**: Edge Functions lack CSRF token validation
⚠ **TypeScript Strictness**: noImplicitAny false, strictNullChecks false (should be enabled)
⚠ **Missing Rate Limiting**: No protection against brute force OTP attempts
⚠ **Paymob Not Integrated**: Payment method defined but not wired

---

## 12. PERFORMANCE OPTIMIZATIONS

### 12.1 Frontend

✓ **Lazy Code Splitting**: All routes lazy-loaded with Suspense
✓ **Vendor Code Splitting**: 6 vendor chunks (react, query, supabase, ui, recharts, i18n)
✓ **TanStack Query Caching**: 60s stale time, 5m GC time
✓ **React.lazy + Suspense**: Route-level code splitting with loading fallback
✓ **Image Optimization**: Courses stored in Supabase Storage (CDN delivery)
✓ **No Sourcemaps in Prod**: Reduced bundle size

### 12.2 Backend

✓ **Database Indexes**: Strategic indexes on common filter/sort columns
✓ **Edge Function Caching**: Stripe client cached (not re-instantiated per request)
✓ **Service Role Bypass**: Webhook uses service_role to avoid RLS overhead
✓ **Query Optimization**: Only select needed columns (useSsraData hooks)

### 12.3 Network

✓ **CORS Pre-flight Optimization**: OPTIONS handler in Edge Functions
✓ **Compression**: Gzip enabled by hosting platform
✓ **Minification**: SWC minification in Vite

---

## 13. TESTING

### 13.1 Current Test Setup

**Framework**: Vitest
**Library**: React Testing Library + jsdom

**Test Files**:
- src/test/pages-smoke.test.tsx - Basic page load tests
- src/test/stripe-catalog.test.ts - Stripe course validation

**Commands**:
```bash
npm run test              # Run tests once
npm run test:watch       # Watch mode
npm run typecheck        # TypeScript validation
```

### 13.2 Test Coverage Gaps

- No tests for authentication flows
- No tests for payment workflows
- No tests for admin dashboards
- No tests for email sending
- No tests for database RLS policies

---

## 14. ARCHITECTURAL PATTERNS & BEST PRACTICES

### 14.1 Patterns Used

✓ **Lazy Code Splitting**: React.lazy for route-level splitting
✓ **Error Boundary**: ErrorBoundary component for crash fallback
✓ **Custom Hooks**: useSsraAuth, useSsraData encapsulate business logic
✓ **RLS-First Security**: Database enforces auth at table level
✓ **Webhook-Driven Updates**: Stripe webhooks update DB (not client-driven)
✓ **Token-Based Auth**: Supabase JWT + auto-refresh
✓ **Optimistic UI Updates**: React Query mutations
✓ **Component Composition**: Radix-UI composable components

### 14.2 Anti-Patterns Found

⚠ **Hardcoded Course Names**: COURSE_NAMES mapping in email functions
⚠ **Loose TypeScript**: noImplicitAny: false, strictNullChecks: false
⚠ **Missing Audit Logs**: admin_audit_log table exists but not populated
⚠ **No Request Validation**: Edge Functions lack input validation middleware
⚠ **Paymob Incomplete**: Payment method defined but not integrated
⚠ **localStorage State**: Session storage in browser (could be lost)
⚠ **No Approval Email**: Application approved but no confirmation sent to student

---

## 15. MISSING / INCOMPLETE FEATURES

### 15.1 Not Yet Implemented

- **Paymob Payments**: Configuration exists, not wired to checkout
- **Approval Email**: ssra_verifications approved but no email sent
- **Customer Portal**: create-portal-session function exists, not exposed
- **Audit Logging**: admin_audit_log table created, not used
- **Course Content Access**: Modules stored as JSON, no player interface
- **Session Recording Access**: recording_url stored, no video player
- **Attendance Import**: Manual admin entry only, no bulk import
- **Email Verification**: No email confirmation on application approval
- **Subscription Management UI**: Can't view/cancel from student portal
- **Course Analytics**: No per-course enrollment/revenue breakdown

### 15.2 Known Bugs

- ⚠ Fix 5 migration: ssra_sessions.course_id was uuid, should be text (FIXED)
- ⚠ RLS policies were overly permissive on enrollments/subscriptions (FIXED)

---

## 16. CONFIGURATION FILES REFERENCE

| File | Purpose |
|------|---------|
| vite.config.ts | Build tool config, code splitting, alias paths |
| tsconfig.json | TypeScript compiler options |
| tsconfig.app.json | App-specific TS settings |
| tailwind.config.ts | Tailwind theme customization |
| postcss.config.js | CSS processing |
| package.json | Dependencies, scripts |
| vercel.json | Vercel deployment config |
| netlify.toml | Netlify deployment config |
| .env.example | Environment variable template |
| .gitignore | Git ignore rules |

---

## 17. DEVELOPER QUICK START

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase + Stripe keys

# Start development
npm run dev
# Open http://localhost:8080

# Run type checking
npm run typecheck

# Build for production
npm run build

# Test
npm run test
npm run test:watch
```

---

## 18. ADMIN QUICK START

### First-Time Setup

1. Create super_admin user in Supabase dashboard
2. Update ssra_profiles.role = 'super_admin'
3. Access /ssra-admin → AdminDashboard

### Common Admin Tasks

**Upload Course Image**:
1. Go to /ssra-admin/courses
2. Click Edit on course
3. Click "Choose File"
4. Image uploaded to Supabase Storage

**Approve Student Application**:
1. Go to /ssra-admin/verifications
2. Click Expand on application
3. Review motivation + details
4. Click "Approve" (optional notes)
5. Student notified (TODO)

**Schedule Zoom Session**:
1. Go to /ssra-admin/sessions
2. Click "New Session"
3. Select course, enter Zoom link
4. Pick date/time
5. Save
6. Auto-visible to subscribers

**Export Student List**:
1. Go to /ssra-admin/students
2. Click "Export CSV"
3. CSV downloads with all student data

---

## 19. SUMMARY OF KEY FILES

| Path | Purpose |
|------|---------|
| src/App.tsx | Route config, providers, auth guards |
| src/pages/ | Page components (one per route) |
| src/components/ssra/ | SSRA-specific layouts + logo |
| src/components/ui/ | Radix-UI component library |
| src/hooks/useSsraAuth.ts | Authentication state |
| src/hooks/useSsraData.ts | All data queries + mutations |
| src/lib/stripe.ts | Stripe config + course catalog |
| src/integrations/supabase/client.ts | Supabase client init |
| src/i18n/index.ts | i18n configuration |
| supabase/functions/ | Deno Edge Functions |
| supabase/migrations/ | Database schema + RLS |
| vite.config.ts | Build configuration |
| tailwind.config.ts | Tailwind customization |
| package.json | Dependencies + scripts |

---

**End of Architectural Analysis**

Generated: June 2, 2026  
SSRA Academy Backend & Frontend Architecture Review
