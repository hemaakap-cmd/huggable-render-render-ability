-- Remove manual approval/verification requirement from all courses.
-- Students can now register and immediately purchase any course.
-- The ssra_verifications table and admin queue are preserved for reference.

UPDATE public.ssra_courses
SET requires_verification = false
WHERE requires_verification = true;
