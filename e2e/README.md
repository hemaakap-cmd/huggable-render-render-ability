# SSRA E2E Test Harness

End-to-end tests run with Playwright against the preview URL (or `E2E_BASE_URL`).
Server-side flows (webhooks, refunds, edge functions) are tested via direct HTTP
calls — not through the browser.

## Honest scope notes (read before "is it ready?")

Some flows from the brief **cannot** be automated from a browser:

| Flow | Status | Reason |
|------|--------|--------|
| Paddle checkout completion | ⚠️ skipped | Card form is in a cross-origin iframe — Paddle's documented limitation. Tested by simulating webhooks. |
| Email verification / password reset link click | ⚠️ skipped | Requires an SMTP catcher (Mailosaur/Mailpit). Not wired. |
| Successful payment | ⚠️ partial | We test the **outcome** by POSTing a signed Paddle simulation to `payments-webhook`. We don't drive the iframe. |
| Refund / chargeback | ✅ tested | Via Paddle Simulations + webhook POST. |
| Duplicate webhook | ✅ tested | POST the same event twice, assert idempotent. |
| Zoom 30-min window | ✅ tested | Direct invocation of `get-session-access` with seeded data at different timestamps. |
| Second-device denial | ✅ tested | Two distinct device tokens → second receives 403. |
| RBAC | ✅ tested | Each persona attempts admin routes; assertion = redirect/403. |
| Arabic-name rejection | ✅ tested | Submits Arabic chars; assertion = client-side error + DB CHECK rejection. |
| Health-check | ✅ tested | Curls `/functions/v1/health-check`, asserts ok/degraded/down JSON shape. |

## Required env vars (CI secrets)

```
E2E_BASE_URL                 # https://… preview or published URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY    # required for seeding personas + webhook signing
PADDLE_SANDBOX_WEBHOOK_SECRET
E2E_STUDENT_EMAIL / _PASSWORD
E2E_INSTRUCTOR_EMAIL / _PASSWORD
E2E_ADMIN_EMAIL / _PASSWORD
E2E_SUPER_ADMIN_EMAIL / _PASSWORD
```

Seed these personas once in your Lovable Cloud project before running CI.

## Running

```bash
bunx playwright install --with-deps chromium
bunx playwright test                 # all
bunx playwright test --project=admin # one persona
bunx playwright test e2e/zoom-security.spec.ts
```

## Layout

```
e2e/
  auth.setup.ts                # logs each persona, persists storageState
  helpers/
    supabase.ts                # service-role client for seeding
    paddle-webhook.ts          # signs + posts Paddle events
  specs/
    01-auth.spec.ts
    02-courses.spec.ts
    03-payments.spec.ts        # webhook-driven, not iframe-driven
    04-zoom-security.spec.ts
    05-rbac.spec.ts
    06-profile-validation.spec.ts
    07-financial-reports.spec.ts
    08-health-check.spec.ts
```
