import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── My enrollments ── */
export function useMyEnrollments() {
  return useQuery({
    queryKey: ["ssra-enrollments-me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*, ssra_courses(*)")
        .eq("status", "active")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── My subscription ── */
export function useMySubscription() {
  return useQuery({
    queryKey: ["ssra-subscription-me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_subscriptions")
        .select("*, ssra_courses(*)")
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ── My verification status ── */
export function useMyVerification() {
  return useQuery({
    queryKey: ["ssra-verification-me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_verifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ── My profile ── */
export function useMyProfile() {
  return useQuery({
    queryKey: ["ssra-profile-me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("ssra_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-profile-me"] }),
  });
}

/* ── Admin: all students ── */
export function useAdminStudents(search = "") {
  return useQuery({
    queryKey: ["ssra-admin-students", search],
    queryFn: async () => {
      let q = supabase
        .from("ssra_profiles")
        .select("*, ssra_enrollments(count), ssra_subscriptions(status)")
        .eq("role", "student")
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Admin: verification queue ── */
export function useAdminVerifications(status?: string) {
  return useQuery({
    queryKey: ["ssra-admin-verifications", status],
    queryFn: async () => {
      let q = supabase
        .from("ssra_verifications")
        .select("*, ssra_profiles(full_name, email, country)")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("ssra_verifications")
        .update({ status, admin_notes: notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-verifications"] }),
  });
}

/* ── Admin: all enrollments ── */
export function useAdminEnrollments() {
  return useQuery({
    queryKey: ["ssra-admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*, ssra_courses(title, price_eur), ssra_profiles(full_name, email)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Admin: all subscriptions ── */
export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ["ssra-admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_subscriptions")
        .select("*, ssra_courses(title, price_eur), ssra_profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Admin: all courses ── */
export function useAdminCourses() {
  return useQuery({
    queryKey: ["ssra-admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (course: Record<string, unknown>) => {
      const { id, ...rest } = course;
      if (id) {
        const { error } = await supabase.from("ssra_courses").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ssra_courses").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] }),
  });
}

export function useToggleCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ssra_courses").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] }),
  });
}

/* ── Admin: stats overview ── */
export function useAdminStats() {
  return useQuery({
    queryKey: ["ssra-admin-stats"],
    queryFn: async () => {
      const [students, enrollments, verifications, subscriptions] = await Promise.all([
        supabase.from("ssra_profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("ssra_enrollments").select("amount_eur").eq("status", "active"),
        supabase.from("ssra_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ssra_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);
      const revenue = (enrollments.data ?? []).reduce((s, e) => s + (e.amount_eur ?? 0), 0);
      return {
        totalStudents:       students.count ?? 0,
        totalRevenue:        revenue,
        pendingVerifications:verifications.count ?? 0,
        activeSubscriptions: subscriptions.count ?? 0,
      };
    },
  });
}
