-- ============================================================
-- Auto-revoke certificates when enrollment is cancelled.
-- Belt-and-suspenders alongside the edge function fix:
-- even if admin-process-cancellation is bypassed or a future
-- code path cancels enrollments directly, certificates are
-- automatically revoked at the database level.
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_certificates_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when status transitions TO 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.ssra_certificates
    SET
      revoked        = TRUE,
      revoked_reason = 'Enrollment cancelled',
      updated_at     = now()
    WHERE
      user_id   = NEW.user_id
      AND course_id = NEW.course_id
      AND revoked   = FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_certificates_on_cancel ON public.ssra_enrollments;

CREATE TRIGGER trg_revoke_certificates_on_cancel
  AFTER UPDATE OF status
  ON public.ssra_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_certificates_on_cancel();
