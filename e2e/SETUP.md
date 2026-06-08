# CI / E2E Setup Guide

Follow this once before enabling the GitHub Actions workflow. Until every
secret is set **and** the seed data exists, the `e2e` job will fail (by
design — it refuses to run blind).

---

## 1. GitHub repository secrets

Go to **GitHub → Settings → Secrets and variables → Actions → New repository secret**
and add each of the following.

### Infrastructure

| Secret | Value | Where to find it |
|---|---|---|
| `E2E_BASE_URL` | `https://huggable-render-render-ability.lovable.app` (or your custom domain) | Lovable → Publish |
| `SUPABASE_URL` | `https://vffcarzhfxlqzfwrhzau.supabase.co` | Lovable Cloud → Backend |
| `SUPABASE_ANON_KEY` | publishable anon key | Lovable Cloud → Backend → API keys |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (keep secret) | Lovable Cloud → Backend → API keys |
| `PADDLE_SANDBOX_WEBHOOK_SECRET` | Paddle sandbox webhook secret | Paddle sandbox dashboard → Notifications → your endpoint |

### Persona accounts

Create each account once in the running app, then store the credentials.
Use addresses you control (recommended pattern: `qa+student@yourdomain.com`).

| Email secret | Password secret | Role to assign |
|---|---|---|
| `E2E_STUDENT_EMAIL` | `E2E_STUDENT_PASSWORD` | (none — default student) |
| `E2E_INSTRUCTOR_EMAIL` | `E2E_INSTRUCTOR_PASSWORD` | `instructor` |
| `E2E_ADMIN_EMAIL` | `E2E_ADMIN_PASSWORD` | `admin` |
| `E2E_SUPER_ADMIN_EMAIL` | `E2E_SUPER_ADMIN_PASSWORD` | `super_admin` |

---

## 2. Seed the personas

Run these SQL statements **once** against the Lovable Cloud database
(Backend → SQL Editor). Replace each `<…>` with the user UUID from
`auth.users` after you've signed each persona up through the normal
signup flow and completed their profile.

```sql
-- Look up UUIDs after sign-up:
select id, email from auth.users
where email in (
  'qa+student@yourdomain.com',
  'qa+instructor@yourdomain.com',
  'qa+admin@yourdomain.com',
  'qa+superadmin@yourdomain.com'
);

-- Assign roles (idempotent thanks to UNIQUE(user_id, role)):
insert into public.user_roles (user_id, role) values
  ('<instructor-uuid>',  'instructor'),
  ('<admin-uuid>',       'admin'),
  ('<super-admin-uuid>', 'super_admin')
on conflict do nothing;
```

Profiles must be complete (Latin-only name, country, etc.) or
`RequireAuth` will bounce the persona to `/complete-profile` and tests
will fail before they assert anything.

---

## 3. Seed one active enrollment + upcoming session

The Zoom-security and "joins upcoming session" specs require **one**
live row of each. Pick any existing `ssra_courses.id` (or create a QA
course) and run:

```sql
-- a) Upcoming session 20 minutes from now (inside the 30-min access window)
insert into public.ssra_sessions
  (id, course_id, title, starts_at, ends_at, instructor_id, status)
values
  (gen_random_uuid(),
   '<course-uuid>',
   'QA Smoke Session',
   now() + interval '20 minutes',
   now() + interval '80 minutes',
   '<instructor-uuid>',
   'scheduled')
returning id;  -- copy this for step (b)

-- b) Zoom credentials in the hardened table (NOT on ssra_sessions)
insert into public.ssra_session_credentials
  (session_id, zoom_link, zoom_password)
values
  ('<session-uuid>',
   'https://zoom.us/j/000000000',
   'qa-test');

-- c) Active enrollment for the student persona
insert into public.ssra_enrollments
  (user_id, course_id, status)
values
  ('<student-uuid>', '<course-uuid>', 'active')
on conflict do nothing;
```

Keep this session row "rolling" — bump `starts_at` weekly, or add a
cron job/edge function that re-seeds it before each CI run.

---

## 4. Verify the secrets are wired (no test run yet)

Trigger the workflow manually: **Actions → CI → Run workflow**.
The `unit` job needs zero secrets and should go green immediately.
If the `e2e` job fails with `Missing required secret: X`, fix the
secret and re-run.

---

## 5. Artifacts

After every run (pass or fail) the workflow uploads:

- `coverage/` — Vitest v8 coverage report (HTML + lcov)
- `playwright-report/` — Playwright HTML report
- `test-results/` — traces, screenshots, videos for failed specs

Download them from the run summary page in GitHub Actions.

---

## 6. Honest status

This setup is **not** "green" until you complete steps 1–3 and a CI
run posts a real ✅ on the commit. The author of this PR has not run
it — the Lovable sandbox has no GitHub Actions runner, no Playwright
browser, and no access to your production secrets. Treat the first
real green run as the source of truth.
