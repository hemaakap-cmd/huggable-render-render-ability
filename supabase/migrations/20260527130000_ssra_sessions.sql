-- Zoom sessions for SSRA courses (Medical German live classes)
create table if not exists public.ssra_sessions (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid references public.ssra_courses(id) on delete cascade,
  title           text not null,
  description     text,
  zoom_link       text not null,
  zoom_password   text,
  scheduled_at    timestamptz not null,
  duration_minutes int not null default 60,
  recording_url   text,
  is_cancelled    boolean not null default false,
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.ssra_sessions enable row level security;

-- Admins can do everything
create policy "admin_all_sessions" on public.ssra_sessions
  for all
  using (
    exists (
      select 1 from public.ssra_profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Active subscribers can read sessions for their subscribed course
create policy "subscriber_read_sessions" on public.ssra_sessions
  for select
  using (
    exists (
      select 1 from public.ssra_subscriptions
      where user_id = auth.uid()
        and course_id = ssra_sessions.course_id
        and status in ('active', 'trialing')
    )
    or
    exists (
      select 1 from public.ssra_profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Index for fast upcoming session queries
create index ssra_sessions_scheduled_at on public.ssra_sessions (scheduled_at);
create index ssra_sessions_course_id    on public.ssra_sessions (course_id);
