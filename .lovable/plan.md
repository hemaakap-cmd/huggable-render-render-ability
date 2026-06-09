# SSRA Academy — Ecosystem Audit & Synchronization Plan

## 1. Framing

SSRA Academy is currently a collection of well-built modules (auth, courses, enrollments, payments, materials, homework, sessions, certificates, instructors, admin) that **mostly** talk to each other through database queries. The problem you're describing isn't that any single module is broken — it's that there is no **shared event bus**. Each module owns its own writes, and the side effects on other modules depend on whoever wrote that code remembering to call them.

That works until it doesn't. One forgotten side-effect = stale dashboards, ghost enrollments, missing emails, orphan certificates.

The goal of this plan is to move SSRA from "modules that share a database" to "an organism that reacts to events", **without** rewriting the whole app. We do it in three layers:

1. **Map** every state-change event and every module that should react to it.
2. **Audit** the current code/DB to find where reactions are missing, duplicated, or out-of-order.
3. **Fix** the highest-impact disconnects in this session and document the rest as follow-ups (one fix per turn is healthier than a 30-file mega-commit).

## 2. The Event Map (the "nervous system")

These are the canonical state-change events of the academy. Every one of them must have a single authoritative writer and a known set of reactors.

```text
Event                           Source of truth                Reactors
──────────────────────────────  ─────────────────────────────  ────────────────────────────────────────────────
enrollment.created (paid)       payments-webhook               enrollments, courses.enrolled_count, revenue_events,
                                                               notifications, email (payment + enrollment),
                                                               instructor dashboard, admin reports, audit log
enrollment.cancelled            admin-process-cancellation     enrollments.status, courses.enrolled_count,
                                                               revenue_events (refund), certificates (revoke),
                                                               session_attendance (frozen), instructor list,
                                                               waitlist promotion, notifications, email, audit
subscription.{created,
  updated,canceled,past_due}    payments-webhook               subscriptions, materials/homework/sessions access,
                                                               instructor dashboard, admin revenue, notifications
course.published / unpublished  AdminCourses                   sessions visibility, materials visibility,
                                                               instructor pages, public site, batches
course.updated (schedule etc.)  AdminCourses                   sessions (regenerate?), enrolled students email,
                                                               instructor schedule, calendar feeds
session.created / link_updated  AdminSessions / instructor     session_credentials, attendance roster,
                                                               enrolled students email, calendar
instructor.assigned             notify-instructor-assignment   instructor_assignments, RLS, notifications, email
instructor.unassigned           notify-instructor-unassignment instructor_assignments, RLS, notifications, email
role.changed                    AdminInstructors / SuperAdmin  profiles.role, sidebar, allowed routes, audit
homework.submitted              MyHomework                     homework_submissions, instructor notif (NEW),
                                                               admin dashboard
homework.graded                 InstructorHomework             homework_submissions, student notif (NEW), email,
                                                               certificate eligibility recalc
attendance.marked               InstructorAttendance / student session_attendance, certificate eligibility
certificate.issued / revoked    AdminCertificates              certificates, student notif, email, audit
verification.{approved,
  rejected}                     AdminVerifications             verifications, student email (already wired)
```

## 3. What this session will deliver

I'm picking the items where the **disconnect is real today** and the fix is bounded. Bigger structural moves (a dedicated `system_events` bus, full Inngest orchestration, scheduled reconciliation jobs) are listed under "follow-up tracks" so we can ship them deliberately.

### Track A — Fix the broken event chains (high impact, low risk)

1. **Cancellation → revenue ledger.** Confirm `admin-process-cancellation` writes a debit row in `revenue_events`. If missing, add it so the admin Revenue report stops over-reporting net revenue after refunds.
2. **Cancellation → certificate.** When an enrollment is cancelled, any issued certificate for that user+course must auto-revoke (set `revoked = true`, audit reason). Today this is manual.
3. **Cancellation → waitlist promotion.** A freed seat should automatically notify the next person on the waitlist (in-app + email). Today the seat just opens silently.
4. **Homework graded → student notification + email.** Today students only see a new grade if they refresh the page. Add a notification row + (optional) transactional email.
5. **Homework submitted → instructor notification.** Mirror of (4) so instructors don't have to poll.
6. **Session link updated → enrolled students email.** The template exists (`session-link-updated`); verify it's actually invoked by the admin/instructor session editor and not silently skipped.
7. **Role changed → audit log + forced re-auth refresh.** Today the sidebar can show stale menus until the user reloads. Write an audit row and have the client subscribe to `ssra_profiles` realtime so the role re-reads instantly.

### Track B — Single source of truth cleanups

8. **Instructor → course relationship.** Already partially done last turn. Sweep the rest of the codebase to make sure **no** read path still uses `ssra_courses.instructor_id` directly when it should consult `is_instructor_for_course()`.
9. **Course `enrolled_count`.** Verified to be maintained by a trigger today. Add a reconciliation read-only RPC `recompute_course_enrolled_count(course_id)` so admins can self-heal one course if drift ever appears.
10. **Notifications schema.** Standardize a small enum of `type` values (`payment`, `enrollment`, `cancellation`, `instructor_assigned`, `instructor_unassigned`, `homework_graded`, `homework_submitted`, `session_updated`, `certificate_issued`, `waitlist_promoted`) so the bell icon can render per-type icons/colors instead of plain strings.

### Track C — Self-healing & observability

11. **Audit log coverage.** Add `ssra_audit_log` rows from the three flows that are missing them today: cancellation processing, instructor (un)assignment, role changes.
12. **Webhook idempotency check.** Confirm the Paddle webhook handler is idempotent on `transaction.completed` so a replayed webhook can't double-create an enrollment / double-credit revenue.
13. **Realtime channels for live dashboards.** Enable `supabase_realtime` on `ssra_enrollments`, `ssra_notifications`, `revenue_events`, `ssra_profiles` and wire the admin overview + notification bell to live-update.

## 4. Out of scope for this turn (named so they're not "forgotten")

- A dedicated `system_events` table acting as an internal event bus (every state change writes one row, every reactor reads it). This is the "right" long-term shape but is a multi-day rewrite. I'd rather propose it as a separate plan once Track A/B/C land.
- Full Inngest-based orchestration of multi-step flows (enroll → email → calendar → CRM). Same reasoning.
- Scheduled nightly reconciliation jobs (drift detection between Paddle, `revenue_events`, and `ssra_enrollments`). I'll scaffold the audit queries but not the cron yet.
- Calendar feed (.ics) for students/instructors. Worth doing, but a separate feature.

## 5. How I'll execute

1. **Read-only audit first.** Use `read_query` + ripgrep to confirm, for every item in Track A/B/C, whether the disconnect actually exists today (some may already be wired; I won't invent fixes).
2. **One commit per track.** Track A as one logical change, Track B as another, Track C as a third. Each commit message names every event chain it touched.
3. **Verify after each change** — query the DB, hit edge functions with `curl_edge_functions`, or open the affected admin page in preview.
4. **End-of-turn report** — a short table of "what was inconsistent → what's wired now → what's still on the backlog".

## 6. What I need from you

Before I touch anything, please confirm:

- **Scope OK?** Tracks A + B + C in one turn, or do you want me to do Track A only and pause for review?
- **Email volume.** For #4 (homework-graded email to every student) — do you want a real email per grade, or just the in-app bell notification? Per-grade emails can be noisy.
- **Waitlist promotion.** When a seat frees up via cancellation, should we **auto-enroll** the next waitlister (creating a pending enrollment they must pay for) or just **notify** them that a seat opened?

Once you answer those three, I start the audit and ship.
