import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Course } from "@/lib/courseCatalog";

/**
 * Centralized enrollment gate.
 *
 * Routing rules:
 * - Not logged in           → /login?redirect=<currentPath>
 * - Course does NOT require verification → /checkout?courseId=...
 * - Approved (any prior approval, or approval for THIS course) → /checkout?courseId=...
 * - Pending application       → toast "under review", stay
 * - Rejected / no application → /apply?course=<id>&intent=...
 *
 * Approval is course-scoped first; if no row exists for the course, we also
 * accept a prior global approval (course_id IS NULL) so returning approved
 * students don't re-apply for sibling courses.
 */
export function useEnrollGate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSsraAuth();

  return useCallback(
    async (course: Pick<Course, "id" | "requires_verification" | "type">) => {
      // Not logged in → login first
      if (!user) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/login?redirect=${redirect}`);
        return;
      }

      // No verification needed → straight to checkout
      if (!course.requires_verification) {
        navigate(`/checkout?courseId=${course.id}`);
        return;
      }

      // Verification required — check existing applications
      const { data, error } = await supabase
        .from("ssra_verifications")
        .select("status, course_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Couldn't verify your application status",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const rows = data ?? [];
      const forCourse = rows.find((r) => r.course_id === course.id);
      const anyApproved = rows.some((r) => r.status === "approved");
      const intent = course.type === "subscription" ? "subscribe" : "enrol";

      // Approved (this course OR previously approved for the program) → checkout
      if (forCourse?.status === "approved" || anyApproved) {
        navigate(`/checkout?courseId=${course.id}`);
        return;
      }

      // Pending for this course (or any pending if no course-specific row) → status toast
      const pending =
        forCourse?.status === "pending" ||
        (!forCourse && rows.some((r) => r.status === "pending"));
      if (pending) {
        toast({
          title: "Application under review",
          description: "We've received your application. You'll get an email within 3–5 business days.",
        });
        navigate("/dashboard");
        return;
      }

      // No application or rejected → apply
      navigate(`/apply?course=${course.id}&intent=${intent}`);
    },
    [navigate, toast, user]
  );
}
