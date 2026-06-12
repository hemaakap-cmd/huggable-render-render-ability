# E2E Setup

The suite runs on every push to `main` and is **tiered by available secrets** —
it is green out of the box and gains depth as you provision more:

| Tier | Secrets needed | What runs |
|------|----------------|-----------|
| 1 — always | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (already set for build) | `anonymous-*` specs: every public page renders, every protected route bounces anonymous visitors |
| 2 — DB integration | + `SUPABASE_SERVICE_ROLE_KEY` | `api-*` specs: waitlist auto-promotion trigger, enrolled_count sync, role-change audit, rate-limit RPC, reconcile_system() self-healing — against the live DB in a self-cleaning sandbox |
| 3 — full portals | + `E2E_PASSWORD` (≥ 12 chars) | persona specs: student / instructor / admin / super-admin portals + cross-role RBAC fencing. Personas are auto-seeded each run (`e2e/seed.mjs`, idempotent) |

## Enabling tier 3

1. Pick a strong password and add it as the `E2E_PASSWORD` GitHub secret.
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (tier 2).
3. Done — the CI seed step creates/refreshes these confirmed users with
   complete profiles and the right roles:
   - `e2e-student@ssra-academy.test` (student)
   - `e2e-instructor@ssra-academy.test` (instructor)
   - `e2e-admin@ssra-academy.test` (admin)
   - `e2e-superadmin@ssra-academy.test` (super_admin)

   Override any email with `E2E_STUDENT_EMAIL` / `E2E_INSTRUCTOR_EMAIL` /
   `E2E_ADMIN_EMAIL` / `E2E_SUPER_ADMIN_EMAIL` secrets if you prefer.

## How auth works

Student login is OTP-only in the UI, so the setup project signs personas in
via the Supabase API (`signInWithPassword`) and injects the session into
Playwright storage state as the `sb-<ref>-auth-token` localStorage entry —
the exact key supabase-js reads on boot. No email round-trip needed.

## Running locally

```bash
# tier 1 only
npx playwright test --project=anonymous

# everything (needs env vars)
SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
E2E_PASSWORD=... npm run e2e:seed && npm run test:e2e
```

Locally the config starts `npm run dev`; in CI it serves the production
bundle via `vite preview` so E2E exercises what actually ships.
