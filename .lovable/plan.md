
# Zoom Broadcast Audience Management Redesign

Make broadcasts targeted, deduplicated, and trackable end-to-end.

## 1. Database changes

### Extend `ssra_zoom_broadcasts`
- `audience_type` text (existed as `audience`; extend with new enum values): `all_students`, `enrolled_after`, `enrolled_before`, `course`, `active_subscribers`, `custom`, `unattended_previous`, `not_previously_invited`, `cohort`
- `audience_filters` jsonb — stores `{ date?, course_id?, batch_id?, broadcast_id?, emails?[] }`
- `opened_count` int default 0
- `joined_count` int default 0

### Extend `ssra_zoom_broadcast_recipients`
Already has: id, broadcast_id, user_id, email, status, sent_at, error.
Add:
- `email_opened` bool default false, `opened_at` timestamptz
- `joined_session` bool default false, `joined_at` timestamptz
- `unsubscribe_token` uuid default gen_random_uuid()
- Index on `(user_id, broadcast_id)` and `(email_opened)`.

### New RPC `resolve_broadcast_audience(_audience text, _filters jsonb, _exclude_prior bool)` → returns table `(user_id uuid, email text, full_name text)`
Server-side resolver used by both preview-count and send. Centralizes targeting logic and supports `not_previously_invited` and `unattended_previous` via NOT EXISTS subqueries against `ssra_zoom_broadcast_recipients`.

### New view `ssra_student_broadcast_history` (security definer fn)
Returns broadcasts + recipient row for a given `_user_id`. Used in student profile.

## 2. Edge function `admin-send-zoom-invitation`
- Accept `audienceType`, `audienceFilters`, `excludePriorRecipients`.
- Validate admin (unchanged).
- Replace direct `select role=student` with `supabase.rpc("resolve_broadcast_audience", …)`.
- Insert recipients with per-row `unsubscribe_token`.
- Email template gets a tracking pixel URL `…/functions/v1/track-broadcast-open?t=<token>` and join-link wrapper `…/track-broadcast-join?t=<token>&r=<zoomLink>`.

## 3. New edge functions
- `track-broadcast-open` (GET, no JWT): marks recipient `email_opened=true`, returns 1×1 GIF, increments `opened_count`.
- `track-broadcast-join` (GET, no JWT): marks `joined_session=true`, 302-redirects to the real Zoom URL.
- `preview-broadcast-audience` (POST, admin): returns `{ total, sample[] }` for current audience selection — replaces the unconditional count in the UI.

## 4. Admin UI — `AdminZoomBroadcast.tsx`
New "Audience" card above the compose form:
- Radio group with the 8 target types.
- Conditional sub-controls (date picker, course select, batch select, prior-broadcast select, emails textarea).
- Live preview chip showing resolved count + first 10 names (calls `preview-broadcast-audience` debounced).
- Checkbox `☑ Exclude students who already received this broadcast`.

Recent broadcasts list:
- Add columns: Opened, Joined.
- Each row links to a new "Broadcast detail" drawer showing the full recipient table with status / opened / joined.

## 5. Student profile — `UserDetailsDialog.tsx`
New "Broadcast history" section listing session title, date, sent/opened/joined badges.

## 6. Cohort support
Use existing `ssra_batches` table as the cohort entity; `audience_type='cohort'` filters enrollments by `batch_id` in filters.

## Technical notes
- All grants follow the four-step pattern; new columns inherit existing GRANTs.
- `resolve_broadcast_audience` is `security definer`, admin-only check at top (`is_ssra_admin(auth.uid())`).
- Tracking endpoints use the `unsubscribe_token` (opaque UUID) — no auth, idempotent.
- Email template (`zoom-invitation.tsx`) updated to inject `{{trackingPixelUrl}}` and `{{trackedJoinUrl}}`.

## Out of scope
- Resend.com webhook-based open tracking (we use pixel; can layer later).
- Per-recipient email A/B variants.
- Scheduled future sends (current send is immediate).

---

**Estimated surface**: 1 migration, 3 edge functions (1 modified + 2 new + 1 new preview), 2 React files, 1 email template. No business-logic changes outside broadcasts.

Confirm and I'll build it.
