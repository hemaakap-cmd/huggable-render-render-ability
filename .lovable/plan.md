# Payments Audit & Reconciliation System

Goal: make every euro in/out traceable, auto-detect mismatches between Paddle (source of truth) and the database, and run continuous checks so the numbers shown to admins are always trustworthy before opening the site to the public.

## 1. Audit Ledger (database)

New table `payment_audit_log` — append-only, every financial event captured:
- `id`, `occurred_at`, `environment` (sandbox/live)
- `event_type` (transaction.completed, subscription.canceled, refund.issued, reconciliation.mismatch, manual.adjustment, …)
- `paddle_event_id` (unique, idempotent)
- `paddle_resource_id` (txn/sub/customer/adjustment id)
- `user_id`, `enrollment_id` (nullable links)
- `amount_cents`, `currency`, `direction` (credit/debit)
- `before_state`, `after_state` (jsonb snapshots)
- `actor` (system/webhook/admin/reconciler), `actor_id`
- `severity` (info/warn/critical), `notes`
- Trigger blocks UPDATE/DELETE (immutable, like `revenue_events`)
- RLS: super admin read-only; service role write

New table `payment_reconciliation_runs`:
- run id, started_at, finished_at, environment
- counts: paddle_txns, db_events, matched, missing_in_db, missing_in_paddle, amount_mismatches
- status (running/ok/discrepancies/failed), summary jsonb

New table `payment_discrepancies`:
- run_id, type (missing_event, amount_mismatch, orphan_enrollment, orphan_subscription, refund_not_applied, …)
- paddle_id, db_id, expected, actual, severity, resolved_at, resolution_notes

## 2. Reconciliation Edge Functions

- `payments-reconcile` — pulls Paddle `/transactions`, `/subscriptions`, `/adjustments` for a window (default last 24h, configurable), diffs against `revenue_events` + `ssra_enrollments` + `ssra_subscriptions`. Writes a run row + discrepancy rows + audit log entries. Runs for both `sandbox` and `live`.
- `payments-audit-snapshot` — daily snapshot of totals (gross, refunds, net, MRR, active subs) per environment into `payment_audit_log` for trend integrity.
- `payments-webhook` — extend existing handler to also write to `payment_audit_log` on every event with before/after snapshot.
- pg_cron schedule:
  - reconcile every 30 min (last 2h window)
  - full daily reconcile at 02:00 UTC (last 48h window)
  - snapshot daily at 00:05 UTC

## 3. Admin "Financial Audit" page

New route `/ssra-admin/audit` (super admin only):
- **Health banner**: latest reconciliation status (✓ all matched / ⚠ N discrepancies / ✗ failed)
- **Reconciliation runs** table with filters by env and date
- **Open discrepancies** list with one-click "investigate" drawer showing Paddle payload + DB rows side-by-side, and actions: mark resolved, create manual adjustment, replay webhook
- **Audit log** searchable feed (filter by event type, user, severity, date)
- **Revenue integrity card**: Paddle total vs DB total per period; red if drift > €0.01
- **Run reconciliation now** button

## 4. Pre-publish hardening

- Force RLS check on every `ssra_*` and `payment_*` table; deny-by-default policies verified
- Remove any test-only enrollments older than 7d in live env (sandbox untouched)
- Add `data_integrity_checks` SQL view exposing: enrollments without payments, payments without enrollments, subscriptions with no matching auth user, profiles with admin role outside allowlist
- Cron job hits the view hourly; any non-empty row → critical audit log entry + admin notification
- Verify webhook secrets present for both envs; surface missing in audit page

## 5. Continuous monitoring

- `ssra_notifications` entry to every super_admin when:
  - reconciliation finds discrepancies
  - integrity view returns rows
  - webhook signature verification fails
  - manual DB mutation detected on financial tables (trigger compares actor)

## Technical notes

- All new functions use existing `_shared/paddle.ts` (`getPaddleClient`, `gatewayFetch`)
- All cron jobs scheduled via `supabase--insert` (contains project URL + anon key, per knowledge rule)
- Frontend uses existing `useSsraData` patterns; new hook `useAuditData`
- No changes to checkout/customer flow — audit is observational
- Both `sandbox` and `live` reconciled separately; UI tab-switches between them

## Out of scope (ask if needed)
- Email/Slack alerts (currently only in-app notifications)
- Auto-remediation of discrepancies (manual review required for safety)
- Historical backfill beyond 90 days (one-off if requested)

Shall I proceed with implementation?
