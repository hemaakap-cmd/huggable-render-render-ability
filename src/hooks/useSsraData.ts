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

/* ── Public: price visibility map (id -> price_hidden) ── */
export function usePriceHiddenMap() {
  return useQuery({
    queryKey: ["ssra-price-hidden-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("id, price_hidden");
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((c: { id: string; price_hidden: boolean }) => {
        map[c.id] = !!c.price_hidden;
      });
      return map;
    },
    staleTime: 60_000,
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
        const { error } = await supabase.from("ssra_courses").update({ ...rest, updated_at: new Date().toISOString() } as never).eq("id", id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ssra_courses").insert(rest as never);
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

export function useTogglePriceHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price_hidden }: { id: string; price_hidden: boolean }) => {
      const { error } = await supabase.from("ssra_courses").update({ price_hidden, updated_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] }),
  });
}

/* ── Sessions: upcoming for subscriber ── */
export function useUpcomingSessions() {
  return useQuery({
    queryKey: ["ssra-sessions-upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("*, ssra_courses(title)")
        .eq("is_cancelled", false)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePastSessions() {
  return useQuery({
    queryKey: ["ssra-sessions-past"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("*, ssra_courses(title)")
        .lt("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Admin: session management ── */
export function useAdminSessions() {
  return useQuery({
    queryKey: ["ssra-admin-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("*, ssra_courses(title)")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: Record<string, unknown>) => {
      const { id, ...rest } = session;
      if (id) {
        const { error } = await supabase.from("ssra_sessions").update(rest as never).eq("id", id as string);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ssra_sessions").insert(rest as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-sessions"] });
      qc.invalidateQueries({ queryKey: ["ssra-sessions-upcoming"] });
      qc.invalidateQueries({ queryKey: ["ssra-sessions-past"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ssra_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-sessions"] });
      qc.invalidateQueries({ queryKey: ["ssra-sessions-upcoming"] });
    },
  });
}

/* ── Admin: session attendance ── */
export function useSessionAttendance(sessionId: string | null) {
  return useQuery({
    queryKey: ["ssra-attendance", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_session_attendance")
        .select("*, ssra_profiles(full_name, email)")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAttendanceSummary() {
  return useQuery({
    queryKey: ["ssra-attendance-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, title, scheduled_at, is_cancelled, ssra_session_attendance(count)")
        .order("scheduled_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId, attended }: { sessionId: string; userId: string; attended: boolean }) => {
      if (attended) {
        const { error } = await supabase.from("ssra_session_attendance")
          .upsert({ session_id: sessionId, user_id: userId }, { onConflict: "session_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ssra_session_attendance")
          .delete().eq("session_id", sessionId).eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ssra-attendance", vars.sessionId] });
      qc.invalidateQueries({ queryKey: ["ssra-attendance-summary"] });
    },
  });
}

/* ── Admin: student growth (monthly, last 8 months) ── */
export function useStudentGrowth() {
  return useQuery({
    queryKey: ["ssra-student-growth"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("created_at")
        .eq("role", "student")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const now = new Date();
      const months: { month: string; students: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ month: d.toLocaleString("en", { month: "short", year: "2-digit" }), students: 0 });
        for (const p of data ?? []) {
          if (p.created_at?.startsWith(key)) months[months.length - 1].students++;
        }
      }
      return months;
    },
  });
}

/* ── Super Admin: manage admin users ── */
export function useAdminUsers() {
  return useQuery({
    queryKey: ["ssra-admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("*")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSearchStudents(query: string) {
  return useQuery({
    queryKey: ["ssra-search-students", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email, role, country")
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "student" | "admin" | "super_admin" }) => {
      const { error } = await supabase
        .from("ssra_profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-users"] });
      qc.invalidateQueries({ queryKey: ["ssra-search-students"] });
      qc.invalidateQueries({ queryKey: ["ssra-admin-students"] });
    },
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
