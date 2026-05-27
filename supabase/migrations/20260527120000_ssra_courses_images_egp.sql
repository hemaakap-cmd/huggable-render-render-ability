-- ============================================================
-- SSRA: Add image_url + price_egp + modules to courses
-- Create Supabase Storage bucket for course images
-- ============================================================

-- Add new columns to courses
alter table public.ssra_courses
  add column if not exists image_url    text,
  add column if not exists price_egp    numeric(10,2),
  add column if not exists modules      jsonb default '[]'::jsonb,
  add column if not exists updated_at   timestamptz default now();

-- Seed default EGP prices (1 EUR ≈ 55 EGP — admin can update)
update public.ssra_courses set price_egp = price_eur * 55
where price_egp is null;

-- Update modules for existing courses
update public.ssra_courses set modules = '["Anatomical foundations","Movement pathology","Rehabilitation planning","German clinical standards","Case study practice"]'::jsonb where id = 'sport-rehab-basics';
update public.ssra_courses set modules = '["Gait analysis","FMS protocols","Video analysis tools","German report writing","Client communication"]'::jsonb where id = 'bewegungsanalyse';
update public.ssra_courses set modules = '["Patient intake process","Treatment planning","GKV documentation","Professional ethics","Referral systems"]'::jsonb where id = 'sporttherapie-praxis';
update public.ssra_courses set modules = '["Body & movement vocabulary","Clinic conversations","Written report templates","Patient explanation scripts","B1 exam preparation"]'::jsonb where id = 'medical-german';
update public.ssra_courses set modules = '["Skeletal anatomy","Muscle function","Joint mechanics","Common sport injuries","German anatomical terms"]'::jsonb where id = 'anatomie-rehab';
update public.ssra_courses set modules = '["Exercise prescription","Progressive overload in rehab","Group vs. individual therapy","Documentation & billing","Real clinic protocols"]'::jsonb where id = 'therapeutisches-training';
update public.ssra_courses set modules = '["Appointment booking phrases","Insurance call scripts","Referral follow-ups","Complaint handling","Role-play practice"]'::jsonb where id = 'telefonkommunikation';
update public.ssra_courses set modules = '["Credential recognition process","Lebenslauf & Anschreiben","Healthcare job platforms","Visa & residence options","Integration support"]'::jsonb where id = 'berufseinstieg';
update public.ssra_courses set modules = '["DOSB exam structure","Sports science theory","German sports law","Practical assessment prep","Mock exams"]'::jsonb where id = 'dosb-vorbereitung';

-- ── Supabase Storage bucket for course images ───────────────
-- (run via Supabase dashboard or CLI if this fails in migration)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ssra-course-images',
  'ssra-course-images',
  true,
  5242880,   -- 5 MB
  array['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: anyone can view, only admins can upload
create policy "Public read course images"
  on storage.objects for select
  using (bucket_id = 'ssra-course-images');

create policy "Admin upload course images"
  on storage.objects for insert
  with check (
    bucket_id = 'ssra-course-images' and
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );

create policy "Admin delete course images"
  on storage.objects for delete
  using (
    bucket_id = 'ssra-course-images' and
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );

-- ── Admin can now full-manage courses ───────────────────────
drop policy if exists "Admin manage courses" on public.ssra_courses;
create policy "Admin manage courses" on public.ssra_courses
  for all using (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.ssra_profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );
