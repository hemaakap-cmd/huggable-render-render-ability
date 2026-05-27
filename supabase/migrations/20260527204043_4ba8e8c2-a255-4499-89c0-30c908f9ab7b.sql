
-- SSRA Academy schema
create table if not exists public.ssra_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, country text, degree text, german_level text, avatar_url text,
  role text not null default 'student' check (role in ('student','admin','super_admin')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select, insert, update on public.ssra_profiles to authenticated;
grant all on public.ssra_profiles to service_role;
alter table public.ssra_profiles enable row level security;

create or replace function public.is_ssra_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.ssra_profiles where id = _uid and role in ('admin','super_admin'))
$$;

create policy "Own profile read" on public.ssra_profiles for select to authenticated using (auth.uid() = id);
create policy "Own profile update" on public.ssra_profiles for update to authenticated using (auth.uid() = id);
create policy "Admin read all profiles" on public.ssra_profiles for select to authenticated using (public.is_ssra_admin(auth.uid()));

create or replace function public.handle_new_ssra_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ssra_profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_ssra on auth.users;
create trigger on_auth_user_created_ssra after insert on auth.users for each row execute procedure public.handle_new_ssra_user();

create table if not exists public.ssra_courses (
  id text primary key, title text not null, title_ar text, subtitle text, description text,
  price_eur numeric(10,2) not null, stripe_price_id text,
  course_type text not null check (course_type in ('one_time','subscription')),
  category text not null check (category in ('clinical','language','career')),
  requires_verification boolean not null default false,
  duration_weeks text, level text, is_active boolean not null default true, sort_order int not null default 0,
  image_url text, price_egp numeric(10,2), modules jsonb default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select on public.ssra_courses to anon, authenticated;
grant insert, update, delete on public.ssra_courses to authenticated;
grant all on public.ssra_courses to service_role;
alter table public.ssra_courses enable row level security;
create policy "Public read active courses" on public.ssra_courses for select using (is_active = true);
create policy "Admin manage courses" on public.ssra_courses for all to authenticated using (public.is_ssra_admin(auth.uid())) with check (public.is_ssra_admin(auth.uid()));

insert into public.ssra_courses (id,title,title_ar,subtitle,price_eur,price_egp,course_type,category,requires_verification,duration_weeks,level,sort_order,modules) values
('medical-german','Medizinisches Deutsch','الألمانية الطبية','German for Sports Scientists — Monthly',29,1595,'subscription','language',true,'Ongoing','A0→B1',1,'["Body & movement vocabulary","Clinic conversations","Written report templates","Patient explanation scripts","B1 exam preparation"]'::jsonb),
('sport-rehab-basics','Grundlagen der Sportrehabilitation','أسس التأهيل الرياضي','Basics of Sports Rehabilitation',49,2695,'one_time','clinical',false,'8 weeks','Beginner',2,'["Anatomical foundations","Movement pathology","Rehabilitation planning","German clinical standards","Case study practice"]'::jsonb),
('bewegungsanalyse','Bewegungsanalyse & Funktionsdiagnostik','تحليل الحركة والتشخيص الوظيفي','Movement Analysis & Functional Diagnostics',59,3245,'one_time','clinical',false,'6 weeks','Intermediate',3,'["Gait analysis","FMS protocols","Video analysis tools","German report writing","Client communication"]'::jsonb),
('sporttherapie-praxis','Sporttherapie in der deutschen Praxis','العلاج الرياضي في الممارسة الألمانية','Sports Therapy in German Practice',79,4345,'one_time','clinical',false,'10 weeks','Intermediate',4,'["Patient intake process","Treatment planning","GKV documentation","Professional ethics","Referral systems"]'::jsonb),
('anatomie-rehab','Anatomie für Sport-Reha','التشريح للتأهيل الرياضي','Applied Anatomy for Rehabilitation',39,2145,'one_time','clinical',false,'5 weeks','Beginner',5,'["Skeletal anatomy","Muscle function","Joint mechanics","Common sport injuries","German anatomical terms"]'::jsonb),
('therapeutisches-training','Therapeutisches Training','التدريب العلاجي','Therapeutic Exercise & Prescription',55,3025,'one_time','clinical',false,'7 weeks','Intermediate',6,'["Exercise prescription","Progressive overload in rehab","Group vs. individual therapy","Documentation & billing","Real clinic protocols"]'::jsonb),
('telefonkommunikation','Telefonkommunikation im Gesundheitswesen','التواصل الهاتفي في الرعاية الصحية','Phone Communication in Healthcare',29,1595,'one_time','language',false,'4 weeks','A2+',7,'["Appointment booking phrases","Insurance call scripts","Referral follow-ups","Complaint handling","Role-play practice"]'::jsonb),
('berufseinstieg','Berufseinstieg & Anerkennung in Deutschland','الدخول المهني في ألمانيا','Career Entry & Credential Recognition',49,2695,'one_time','career',false,'6 weeks','All levels',8,'["Credential recognition process","Lebenslauf & Anschreiben","Healthcare job platforms","Visa & residence options","Integration support"]'::jsonb),
('dosb-vorbereitung','DOSB-Lizenz Vorbereitung','التحضير للترخيص الألماني DOSB','German Sports Federation Licence Prep',69,3795,'one_time','career',false,'8 weeks','Advanced',9,'["DOSB exam structure","Sports science theory","German sports law","Practical assessment prep","Mock exams"]'::jsonb)
on conflict (id) do nothing;

create table if not exists public.ssra_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null, email text not null, country text, degree text, graduation_year text,
  german_level text, motivation text, course_id text references public.ssra_courses(id), diploma_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, admin_notes text,
  created_at timestamptz default now()
);
grant select, insert, update on public.ssra_verifications to authenticated;
grant all on public.ssra_verifications to service_role;
alter table public.ssra_verifications enable row level security;
create policy "Own verification read" on public.ssra_verifications for select to authenticated using (auth.uid() = user_id);
create policy "Own verification insert" on public.ssra_verifications for insert to authenticated with check (auth.uid() = user_id);
create policy "Admin manage verifications" on public.ssra_verifications for all to authenticated using (public.is_ssra_admin(auth.uid())) with check (public.is_ssra_admin(auth.uid()));

create table if not exists public.ssra_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id text references public.ssra_courses(id),
  stripe_session_id text, stripe_payment_intent text, amount_eur numeric(10,2),
  status text not null default 'pending' check (status in ('pending','active','refunded')),
  enrolled_at timestamptz, created_at timestamptz default now(),
  unique (user_id, course_id)
);
grant select on public.ssra_enrollments to authenticated;
grant all on public.ssra_enrollments to service_role;
alter table public.ssra_enrollments enable row level security;
create policy "Own enrollments read" on public.ssra_enrollments for select to authenticated using (auth.uid() = user_id);
create policy "Admin read all enrollments" on public.ssra_enrollments for select to authenticated using (public.is_ssra_admin(auth.uid()));

create table if not exists public.ssra_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id text references public.ssra_courses(id),
  stripe_subscription_id text unique, stripe_customer_id text,
  status text not null default 'active' check (status in ('active','canceled','past_due','trialing','paused','incomplete')),
  current_period_start timestamptz, current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
grant select on public.ssra_subscriptions to authenticated;
grant all on public.ssra_subscriptions to service_role;
alter table public.ssra_subscriptions enable row level security;
create policy "Own subscription read" on public.ssra_subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "Admin read all subscriptions" on public.ssra_subscriptions for select to authenticated using (public.is_ssra_admin(auth.uid()));

-- Storage bucket for course images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ssra-course-images','ssra-course-images',true,5242880,array['image/jpeg','image/jpg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "Public read course images" on storage.objects;
create policy "Public read course images" on storage.objects for select using (bucket_id = 'ssra-course-images');
drop policy if exists "Admin upload course images" on storage.objects;
create policy "Admin upload course images" on storage.objects for insert to authenticated with check (bucket_id = 'ssra-course-images' and public.is_ssra_admin(auth.uid()));
drop policy if exists "Admin delete course images" on storage.objects;
create policy "Admin delete course images" on storage.objects for delete to authenticated using (bucket_id = 'ssra-course-images' and public.is_ssra_admin(auth.uid()));
