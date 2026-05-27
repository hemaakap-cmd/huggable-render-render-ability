-- ============================================================
-- SSRA Academy SaaS Schema
-- Courses · Enrollments · Subscriptions · Student Verifications
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
create table if not exists public.ssra_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  country      text,
  degree       text,
  german_level text,
  avatar_url   text,
  role         text not null default 'student' check (role in ('student', 'admin', 'super_admin')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.ssra_profiles enable row level security;

create policy "Own profile read" on public.ssra_profiles
  for select using (auth.uid() = id);

create policy "Own profile update" on public.ssra_profiles
  for update using (auth.uid() = id);

create policy "Admin read all profiles" on public.ssra_profiles
  for select using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- auto-create profile on signup
create or replace function public.handle_new_ssra_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.ssra_profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ssra on auth.users;
create trigger on_auth_user_created_ssra
  after insert on auth.users
  for each row execute procedure public.handle_new_ssra_user();

-- ── Courses catalogue ─────────────────────────────────────────
create table if not exists public.ssra_courses (
  id                    text primary key,
  title                 text not null,
  title_ar              text,
  subtitle              text,
  description           text,
  price_eur             numeric(10,2) not null,
  stripe_price_id       text,
  course_type           text not null check (course_type in ('one_time', 'subscription')),
  category              text not null check (category in ('clinical', 'language', 'career')),
  requires_verification boolean not null default false,
  duration_weeks        text,
  level                 text,
  is_active             boolean not null default true,
  sort_order            int not null default 0,
  created_at            timestamptz default now()
);

alter table public.ssra_courses enable row level security;

create policy "Public read active courses" on public.ssra_courses
  for select using (is_active = true);

create policy "Admin manage courses" on public.ssra_courses
  for all using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- seed courses
insert into public.ssra_courses
  (id, title, title_ar, subtitle, price_eur, course_type, category, requires_verification, duration_weeks, level, sort_order)
values
  ('medical-german',      'Medizinisches Deutsch',                    'الألمانية الطبية',                      'German for Sports Scientists — Monthly',   29,  'subscription', 'language', true,  'Ongoing', 'A0→B1', 1),
  ('sport-rehab-basics',  'Grundlagen der Sportrehabilitation',       'أسس التأهيل الرياضي',                   'Basics of Sports Rehabilitation',          49,  'one_time',     'clinical', false, '8 weeks', 'Beginner', 2),
  ('bewegungsanalyse',    'Bewegungsanalyse & Funktionsdiagnostik',   'تحليل الحركة والتشخيص الوظيفي',        'Movement Analysis & Functional Diagnostics',59, 'one_time',     'clinical', false, '6 weeks', 'Intermediate', 3),
  ('sporttherapie-praxis','Sporttherapie in der deutschen Praxis',    'العلاج الرياضي في الممارسة الألمانية',  'Sports Therapy in German Practice',        79,  'one_time',     'clinical', false, '10 weeks','Intermediate', 4),
  ('anatomie-rehab',      'Anatomie für Sport-Reha',                  'التشريح للتأهيل الرياضي',               'Applied Anatomy for Rehabilitation',        39,  'one_time',     'clinical', false, '5 weeks', 'Beginner', 5),
  ('therapeutisches-training','Therapeutisches Training',             'التدريب العلاجي',                        'Therapeutic Exercise & Prescription',       55,  'one_time',     'clinical', false, '7 weeks', 'Intermediate', 6),
  ('telefonkommunikation','Telefonkommunikation im Gesundheitswesen', 'التواصل الهاتفي في الرعاية الصحية',     'Phone Communication in Healthcare',        29,  'one_time',     'language', false, '4 weeks', 'A2+', 7),
  ('berufseinstieg',      'Berufseinstieg & Anerkennung in Deutschland','الدخول المهني في ألمانيا',             'Career Entry & Credential Recognition',    49,  'one_time',     'career',   false, '6 weeks', 'All levels', 8),
  ('dosb-vorbereitung',   'DOSB-Lizenz Vorbereitung',                 'التحضير للترخيص الألماني DOSB',         'German Sports Federation Licence Prep',    69,  'one_time',     'career',   false, '8 weeks', 'Advanced', 9)
on conflict (id) do nothing;

-- ── Student verifications ─────────────────────────────────────
create table if not exists public.ssra_verifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text not null,
  country         text,
  degree          text,
  graduation_year text,
  german_level    text,
  motivation      text,
  course_id       text references public.ssra_courses(id),
  diploma_url     text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  admin_notes     text,
  created_at      timestamptz default now()
);

alter table public.ssra_verifications enable row level security;

create policy "Own verification read" on public.ssra_verifications
  for select using (auth.uid() = user_id);

create policy "Own verification insert" on public.ssra_verifications
  for insert with check (auth.uid() = user_id);

create policy "Admin manage verifications" on public.ssra_verifications
  for all using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- ── Enrollments (one-time course purchases) ───────────────────
create table if not exists public.ssra_enrollments (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users(id) on delete cascade,
  course_id               text references public.ssra_courses(id),
  stripe_session_id       text,
  stripe_payment_intent   text,
  amount_eur              numeric(10,2),
  status                  text not null default 'pending'
                            check (status in ('pending', 'active', 'refunded')),
  enrolled_at             timestamptz,
  created_at              timestamptz default now(),
  unique (user_id, course_id)
);

alter table public.ssra_enrollments enable row level security;

create policy "Own enrollments read" on public.ssra_enrollments
  for select using (auth.uid() = user_id);

create policy "Admin read all enrollments" on public.ssra_enrollments
  for select using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

create policy "Service role insert enrollments" on public.ssra_enrollments
  for insert with check (true);

create policy "Service role update enrollments" on public.ssra_enrollments
  for update using (true);

-- ── Subscriptions (recurring) ─────────────────────────────────
create table if not exists public.ssra_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users(id) on delete cascade,
  course_id             text references public.ssra_courses(id),
  stripe_subscription_id text unique,
  stripe_customer_id    text,
  status                text not null default 'active'
                          check (status in ('active', 'canceled', 'past_due', 'trialing', 'paused', 'incomplete')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

alter table public.ssra_subscriptions enable row level security;

create policy "Own subscription read" on public.ssra_subscriptions
  for select using (auth.uid() = user_id);

create policy "Admin read all subscriptions" on public.ssra_subscriptions
  for select using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

create policy "Service role manage subscriptions" on public.ssra_subscriptions
  for all using (true);

-- ── Helpers: revenue view for admin ──────────────────────────
create or replace view public.ssra_revenue_summary as
select
  date_trunc('month', enrolled_at)::date as month,
  count(*) as enrollment_count,
  sum(amount_eur) as revenue_eur
from public.ssra_enrollments
where status = 'active'
group by 1
order by 1 desc;

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists ssra_enrollments_user_idx   on public.ssra_enrollments(user_id);
create index if not exists ssra_enrollments_course_idx on public.ssra_enrollments(course_id);
create index if not exists ssra_enrollments_status_idx on public.ssra_enrollments(status);
create index if not exists ssra_subs_user_idx          on public.ssra_subscriptions(user_id);
create index if not exists ssra_subs_stripe_idx        on public.ssra_subscriptions(stripe_subscription_id);
create index if not exists ssra_verif_user_idx         on public.ssra_verifications(user_id);
create index if not exists ssra_verif_status_idx       on public.ssra_verifications(status);
