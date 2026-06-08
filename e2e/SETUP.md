# CI / E2E Setup Guide

Follow this once before enabling the GitHub Actions `e2e` job.
Until every secret is set **and** the seed data exists, the E2E job will fail.
Unit tests (Vitest) have no external dependencies and run on every push.

---

## 1. GitHub Actions Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**.

### Infrastructure

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL, e.g. `https://vffcarzhfxlqzfwrhzau.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_PADDLE_CLIENT_TOKEN` | Paddle Sandbox client-side token |
| `VITE_PADDLE_PRICE_MEDICAL_GERMAN` | Paddle price ID for medical-german course |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — keep secret, never expose client-side |
| `E2E_BASE_URL` | URL to test against, e.g. `https://huggable-render-render-ability.lovable.app` |

### Persona accounts

| Secret | Role |
|--------|------|
| `E2E_STUDENT_EMAIL` | student (default role) |
| `E2E_INSTRUCTOR_EMAIL` | instructor |
| `E2E_ADMIN_EMAIL` | admin |
| `E2E_SUPER_ADMIN_EMAIL` | super_admin |

---

## 2. Provision test accounts

Sign each persona up through the normal app signup flow (fill full Latin-only
profile) then run the SQL below once in **Supabase → SQL Editor**:

```sql
-- Look up UUIDs after sign-up:
SELECT id, email FROM auth.users
WHERE email IN (
  'qa+student@yourdomain.com',
  'qa+instructor@yourdomain.com',
  'qa+admin@yourdomain.com',
  'qa+superadmin@yourdomain.com'
);

-- Set roles (ssra_profiles.role column):
UPDATE public.ssra_profiles SET role = 'instructor'  WHERE email = 'qa+instructor@yourdomain.com';
UPDATE public.ssra_profiles SET role = 'admin'        WHERE email = 'qa+admin@yourdomain.com';
UPDATE public.ssra_profiles SET role = 'super_admin'  WHERE email = 'qa+superadmin@yourdomain.com';
```

Profiles must be complete (Latin-only name, phone, country, city, address,
degree, german_level) or `RequireAuth` will redirect to `/complete-profile`.

---

## 3. Seed one active enrollment and upcoming session

The Zoom-security and "joins upcoming session" specs require live rows:

```sql
-- a) Upcoming session 20 minutes from now (inside the 30-min access window)
INSERT INTO public.ssra_sessions
  (id, course_id, title, starts_at, ends_at, instructor_id, status)
VALUES
  (gen_random_uuid(),
   '<course-uuid>',
   'QA Smoke Session',
   now() + INTERVAL '20 minutes',
   now() + INTERVAL '80 minutes',
   '<instructor-uuid>',
   'scheduled')
RETURNING id;  -- copy this session UUID for step (b)

-- b) Zoom credentials (kept in hardened table, not on ssra_sessions)
INSERT INTO public.ssra_session_credentials (session_id, zoom_link, zoom_password)
VALUES ('<session-uuid>', 'https://zoom.us/j/000000000', 'qa-test');

-- c) Active enrollment for the student persona
INSERT INTO public.ssra_enrollments (user_id, course_id, status)
VALUES ('<student-uuid>', '<course-uuid>', 'active')
ON CONFLICT DO NOTHING;
```

Bump `starts_at` weekly or run a cron to re-seed before each CI run.

---

## 4. Auth storage files

The Playwright `setup` project creates signed-in browser state for each persona
and saves it under `e2e/.auth/` (gitignored):

```
e2e/.auth/student.json
e2e/.auth/instructor.json
e2e/.auth/admin.json
e2e/.auth/super-admin.json
```

---

## 5. Running locally

```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install chromium

# Copy and fill env vars
cp .env.example .env.local   # add VITE_* and E2E_* values

# Run the dev server in a separate terminal
npm run dev

# Run all E2E tests
npx playwright test

# Run a specific persona project
npx playwright test --project student
```

---

## 6. Test coverage goals

| Area | Anonymous | Student | Instructor | Admin | Super Admin |
|------|:---------:|:-------:|:----------:|:-----:|:-----------:|
| Home / Pricing pages render | ✓ | | | | |
| Redirect to /login when unauthenticated | ✓ | | | | |
| Student dashboard loads | | ✓ | | | |
| Enroll in a course (checkout flow) | | ✓ | | | |
| View Zoom link within access window | | ✓ | | | |
| Zoom link hidden outside window | | ✓ | | | |
| Instructor session list | | | ✓ | | |
| Admin: view enrollments | | | | ✓ | |
| Admin: approve cancellation | | | | ✓ | |
| Super Admin: financial report widget | | | | | ✓ |
| Super Admin: user role management | | | | | ✓ |
| Health check endpoint returns 200 | ✓ | | | | |

---

## 7. Important notes

- **Paddle payments** — use sandbox card `4111 1111 1111 1111`; never trigger
  live charges from tests.
- **OTP login** — cannot be automated without inbox access. Use Supabase magic
  link via service role key in the setup step.
- **E2E job** runs only on `push` to `main` (skipped on PRs) to protect Paddle
  sandbox rate limits and avoid spurious failures on WIP branches.
- The first real ✅ green CI run is the authoritative proof of E2E readiness.
