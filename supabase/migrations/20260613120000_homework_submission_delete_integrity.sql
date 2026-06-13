-- M3 — HOMEWORK SUBMISSION INTEGRITY
-- Live audit (2026-06-13) found: (a) ssra_homework_submissions has NO DELETE
-- policy (undeletable by any client role), and (b) deleting a homework material
-- set submission.material_id = NULL (FK ON DELETE SET NULL), leaving graded
-- submissions pointing at nothing. One such orphan was left by the audit.
-- Fix: purge orphans, switch the FK to ON DELETE CASCADE (a deleted assignment
-- takes its submissions with it — no dangling grades), and add a DELETE policy.

-- 1. Purge any existing orphaned submissions (incl. the audit's leftover row).
DELETE FROM public.ssra_homework_submissions WHERE material_id IS NULL;

-- 2. Re-point the material FK to CASCADE. Drop whatever the live FK is named
--    (it may differ from the repo), then re-add with ON DELETE CASCADE.
DO $$
DECLARE fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'ssra_homework_submissions'
    AND con.contype = 'f'
    AND con.conkey = (
      SELECT array_agg(attnum)
      FROM pg_attribute
      WHERE attrelid = rel.oid AND attname = 'material_id'
    );
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.ssra_homework_submissions DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.ssra_homework_submissions
  ADD CONSTRAINT ssra_homework_submissions_material_id_fkey
  FOREIGN KEY (material_id) REFERENCES public.ssra_materials(id) ON DELETE CASCADE;

-- 3. DELETE policy: admins and the assigned instructor may delete any submission
--    in scope; a student may delete only their OWN, still-ungraded submission.
DROP POLICY IF EXISTS "homework_delete_own_or_staff" ON public.ssra_homework_submissions;
CREATE POLICY "homework_delete_own_or_staff" ON public.ssra_homework_submissions
  FOR DELETE TO authenticated
  USING (
    public.is_ssra_admin(auth.uid())
    OR public.is_instructor_for_course(auth.uid(), course_id)
    OR (user_id = auth.uid() AND status <> 'graded')
  );

INSERT INTO public.ssra_audit_log (actor_email, actor_role, action, resource_type, resource_id, details)
VALUES ('system-migration','system','homework_submission_integrity_applied','rls','20260613120000',
  jsonb_build_object('fix','M3',
    'detail','orphans purged; material_id FK -> ON DELETE CASCADE; DELETE policy added (owner-ungraded / staff)'));
