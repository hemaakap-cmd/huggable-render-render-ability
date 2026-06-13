import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { courseFromRecord, type CourseRecord } from "@/lib/courseCatalog";

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

/* ── Admin: paginated CUSTOMERS (students with ≥1 enrollment) ── */
export function useAdminStudents(search = "", page = 0, pageSize = 25) {
  return useQuery({
    queryKey: ["ssra-admin-students-paying", search, page, pageSize],
    queryFn: async () => {
      // Fully server-side: filter + join + aggregate + paginate + count happen
      // inside get_admin_students() (migration 20260612230000). The response
      // is always exactly one page of rows regardless of table size — safe at
      // 100k+ students.
      const { data, error } = await supabase.rpc("get_admin_students" as never, {
        _search:    search || null,
        _page:      page,
        _page_size: pageSize,
      } as never);
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        id: string; full_name: string | null; email: string | null;
        role: string; country: string | null; city: string | null;
        phone_number: string | null; created_at: string;
        total_enrollments: number; active_enrollments: number;
        unique_courses: number; course_ids: string[] | null;
        first_enrolled_at: string | null; latest_sub_status: string | null;
        total_count: number;
      }>;

      return {
        // Map to the row shape AdminStudents.tsx already consumes
        rows: rows.map((s) => ({
          ...s,
          ssra_enrollments:        [{ count: Number(s.total_enrollments) || 0 }],
          ssra_active_enrollments: Number(s.active_enrollments) || 0,
          ssra_unique_courses:     Number(s.unique_courses) || 0,
          ssra_course_ids:         s.course_ids ?? [],
          ssra_first_enrolled_at:  s.first_enrolled_at ?? null,
          ssra_subscriptions:      s.latest_sub_status ? [{ status: s.latest_sub_status }] : [],
        })),
        total: rows[0] ? Number(rows[0].total_count) : 0,
      };
    },
  });
}


/* ── Admin: paginated LEADS (students with ZERO enrollments) ── */
export function useAdminLeads(search = "", page = 0, pageSize = 25) {
  return useQuery({
    queryKey: ["ssra-admin-leads", search, page, pageSize],
    queryFn: async () => {
      // Use the enrollment stats view to get the set of user_ids that have
      // at least one enrollment — avoids loading all enrollment rows client-side.
      const { data: statsRows, error: statsErr } = await (supabase as any)
        .from("ssra_student_enrollment_stats")
        .select("user_id");
      if (statsErr) throw statsErr;
      const enrolledIds = new Set(
        (statsRows ?? []).map((r: any) => r.user_id as string).filter(Boolean),
      );

      const from = page * pageSize;
      const to   = from + pageSize - 1;
      let q = supabase
        .from("ssra_profiles")
        .select("*", { count: "exact" })
        .eq("role", "student")
        .order("created_at", { ascending: false });
      if (enrolledIds.size > 0) {
        q = q.not("id", "in", `(${Array.from(enrolledIds).join(",")})`);
      }
      if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;

      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

/* ── Admin: leads/students summary stats ── */
export function useLeadStudentStats() {
  return useQuery({
    queryKey: ["ssra-admin-leads-students-stats"],
    queryFn: async () => {
      // Single server-side RPC replaces the old dual full-table read
      // (ssra_profiles + ssra_enrollments) that was fetching all rows client-side.
      const { data, error } = await supabase.rpc("get_lead_student_stats" as never);
      if (error) throw error;
      const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
      if (!row) return {
        totalLeads: 0, totalStudents: 0, newLeadsThisMonth: 0,
        newStudentsThisMonth: 0, conversionRate: 0, totalRevenue: 0, revenuePerStudent: 0,
      };
      return {
        totalLeads:            Number(row.total_leads ?? 0),
        totalStudents:         Number(row.total_students ?? 0),
        newLeadsThisMonth:     Number(row.new_leads_this_month ?? 0),
        newStudentsThisMonth:  Number(row.new_students_this_month ?? 0),
        conversionRate:        Number(row.conversion_rate ?? 0),
        totalRevenue:          Number(row.total_revenue_eur ?? 0),
        revenuePerStudent:     Number(row.revenue_per_student ?? 0),
      };
    },
  });
}


/* ── Admin: paginated verification queue ── */
export function useAdminVerifications(status?: string, page = 0, pageSize = 25) {
  return useQuery({
    queryKey: ["ssra-admin-verifications", status, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to   = from + pageSize - 1;
      let q = supabase
        .from("ssra_verifications")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

/* ── Admin: revenue summary (DB view) ── */
export function useRevenueSummary() {
  return useQuery({
    queryKey: ["ssra-revenue-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_revenue_summary" as never)
        .select("*")
        .order("month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        month: string;
        course_id: string | null;
        course_title: string | null;
        enrollments: number;
        revenue_eur: number;
      }>;
    },
  });
}

export function useUpdateVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      // 1. Fetch the verification + course so we can include them in the notification email
      const { data: verification, error: fetchErr } = await supabase
        .from("ssra_verifications")
        .select("id, full_name, email, course_id")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      // 2. Update the verification row
      const { error } = await supabase
        .from("ssra_verifications")
        .update({ status, admin_notes: notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // 3. Notify the student — never block the admin flow if email fails
      if (verification?.email && (status === "approved" || status === "rejected")) {
        try {
          let courseName: string | undefined;
          if (verification.course_id) {
            const { data: course } = await supabase
              .from("ssra_courses")
              .select("title")
              .eq("id", verification.course_id)
              .maybeSingle();
            courseName = course?.title ?? undefined;
          }
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: status === "approved" ? "verification-approved" : "verification-rejected",
              recipientEmail: verification.email,
              idempotencyKey: `verification-${id}-${status}`,
              templateData: {
                studentName: verification.full_name ?? undefined,
                courseName,
                adminNotes: notes?.trim() || undefined,
              },
            },
          });
        } catch (emailErr) {
          // Log but don't fail the mutation — admin already approved/rejected successfully
          console.error("[verification-email] failed to send:", emailErr);
        }
      }
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
        .select("*, ssra_courses(title, price_eur)")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((e) => e.user_id).filter((id): id is string => Boolean(id)))];
      if (userIds.length === 0) return rows;

      const { data: profiles, error: profilesError } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((e) => ({ ...e, ssra_profiles: e.user_id ? profilesById.get(e.user_id) ?? null : null }));
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
        .select("*, ssra_courses(title, price_eur)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((s) => s.user_id).filter((id): id is string => Boolean(id)))];
      if (userIds.length === 0) return rows;

      const { data: profiles, error: profilesError } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((s) => ({ ...s, ssra_profiles: s.user_id ? profilesById.get(s.user_id) ?? null : null }));
    },
  });
}

/* ── Admin: all courses ── */
export function usePublicCourses() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("rt-public-courses")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ssra_courses" },
        () => {
          qc.invalidateQueries({ queryKey: ["ssra-public-courses"] });
          qc.invalidateQueries({ queryKey: ["public-home-stats"] });
          qc.invalidateQueries({ queryKey: ["ssra-price-hidden-map"] });
          qc.invalidateQueries({ queryKey: ["ssra-courses-capacity-map"] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["ssra-public-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("id, title, title_ar, subtitle, description, price_eur, course_type, category, requires_verification, duration_weeks, level, price_hidden, modules, is_subscription")
        .eq("is_active", true)
        .neq("id", "test-course")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as CourseRecord[]).map(courseFromRecord);
    },
    refetchInterval: 15_000,
  });
}

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] });
      qc.invalidateQueries({ queryKey: ["ssra-public-courses"] });
      qc.invalidateQueries({ queryKey: ["public-home-stats"] });
    },
  });
}

export function useToggleCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ssra_courses").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] });
      qc.invalidateQueries({ queryKey: ["ssra-public-courses"] });
      qc.invalidateQueries({ queryKey: ["public-home-stats"] });
    },
  });
}

export function useTogglePriceHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price_hidden }: { id: string; price_hidden: boolean }) => {
      const { error } = await supabase.from("ssra_courses").update({ price_hidden, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] });
      qc.invalidateQueries({ queryKey: ["ssra-public-courses"] });
      qc.invalidateQueries({ queryKey: ["ssra-price-hidden-map"] });
    },
  });
}

export function usePriceHiddenMap() {
  return useQuery({
    queryKey: ["ssra-price-hidden-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ssra_courses").select("id, price_hidden");
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((c: { id: string; price_hidden: boolean | null }) => {
        map[c.id] = !!c.price_hidden;
      });
      return map;
    },
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

/* ── Sessions: upcoming filtered to the user's enrolled/subscribed courses ── */
export function useMyUpcomingSessions() {
  return useQuery({
    queryKey: ["ssra-sessions-mine-upcoming"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const [{ data: enrollments }, { data: subscriptions }] = await Promise.all([
        supabase.from("ssra_enrollments").select("course_id").eq("user_id", user.id).eq("status", "active"),
        supabase.from("ssra_subscriptions").select("course_id").eq("user_id", user.id).in("status", ["active", "trialing"]),
      ]);

      const courseIds = [
        ...(enrollments ?? []).map((e) => e.course_id),
        ...(subscriptions ?? []).map((s) => s.course_id),
      ].filter((id): id is string => Boolean(id));

      if (courseIds.length === 0) return [];

      // Zoom credentials no longer live on ssra_sessions; they're delivered
      // only by the get-session-access edge function within the access window.
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, course_id, title, description, scheduled_at, duration_minutes, is_cancelled, recording_url, ssra_courses(title)")
        .eq("is_cancelled", false)
        .in("course_id", courseIds)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Recordings are paid content — only return sessions for courses the
      // user is actively enrolled in or subscribed to.
      const [{ data: enrollments }, { data: subscriptions }] = await Promise.all([
        supabase.from("ssra_enrollments").select("course_id").eq("user_id", user.id).eq("status", "active"),
        supabase.from("ssra_subscriptions").select("course_id").eq("user_id", user.id).in("status", ["active", "trialing", "canceled"]),
      ]);

      const courseIds = [
        ...(enrollments ?? []).map((e) => e.course_id),
        ...(subscriptions ?? []).map((s) => s.course_id),
      ].filter((id): id is string => Boolean(id));

      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, course_id, title, description, scheduled_at, duration_minutes, is_cancelled, recording_url, ssra_courses(title)")
        .in("course_id", courseIds)
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
        return id as string;
      } else {
        const { data, error } = await supabase.from("ssra_sessions").insert(rest as never).select("id").single();
        if (error) throw error;
        return (data as any).id as string;
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
        .select("*")
        .eq("session_id", sessionId!);
      if (error) throw error;

      const rows = data ?? [];
      const userIds = [...new Set(rows.map((a) => a.user_id).filter((id): id is string => Boolean(id)))];
      if (userIds.length === 0) return rows;

      const { data: profiles, error: profilesError } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((a) => ({ ...a, ssra_profiles: a.user_id ? profilesById.get(a.user_id) ?? null : null }));
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
        .in("role", ["admin", "super_admin", "instructor"])
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
    mutationFn: async ({ userId, role }: { userId: string; role: "student" | "instructor" | "admin" | "super_admin" }) => {
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

/* ── Super Admin: view as student ── */
export function useStudentProfileById(userId: string) {
  return useQuery({
    queryKey: ["ssra-student-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentEnrollmentsById(userId: string) {
  return useQuery({
    queryKey: ["ssra-student-enrollments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*, ssra_courses(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStudentSubscriptionById(userId: string) {
  return useQuery({
    queryKey: ["ssra-student-subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_subscriptions")
        .select("*, ssra_courses(*)")
        .eq("user_id", userId)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentVerificationById(userId: string) {
  return useQuery({
    queryKey: ["ssra-student-verification", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_verifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentAttendanceById(userId: string) {
  return useQuery({
    queryKey: ["ssra-student-attendance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_session_attendance")
        .select("*, ssra_sessions(title, scheduled_at, duration_minutes, ssra_courses(title))")
        .eq("user_id", userId)
        .order("attended_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Super Admin: admin activity feed ── */
export function useAdminActivityFeed() {
  return useQuery({
    queryKey: ["ssra-admin-activity-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_verifications")
        .select("id, full_name, email, status, reviewed_at, admin_notes, created_at, reviewer:ssra_profiles!ssra_verifications_reviewed_by_fkey(id, full_name, email)")
        .not("reviewed_at", "is", null)
        .order("reviewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminSessionsActivity() {
  return useQuery({
    queryKey: ["ssra-admin-sessions-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("id, title, scheduled_at, is_cancelled, created_at, ssra_courses(title)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminCoursesActivity() {
  return useQuery({
    queryKey: ["ssra-admin-courses-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("id, title, title_ar, is_active, price_eur, updated_at, created_at, category, course_type")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ── Admin: stats overview ── */
export function useAdminStats() {
  return useQuery({
    queryKey: ["ssra-admin-stats"],
    queryFn: async () => {
      const [students, enrollments, verifications, subscriptions, ledger] = await Promise.all([
        supabase.from("ssra_profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("ssra_enrollments").select("amount_eur").eq("status", "active"),
        supabase.from("ssra_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ssra_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.rpc("get_revenue_summary", {
          _from: "2020-01-01T00:00:00Z",
          _to:   new Date(Date.now() + 86_400_000).toISOString(),
          _env:  "live",
        } as any),
      ]);
      // Source of truth: real money from the payment ledger (gross − refunds − chargebacks).
      const row = Array.isArray(ledger.data) ? (ledger.data as any[])[0] : (ledger.data as any);
      const ledgerRevenue = row
        ? (Number(row.gross_cents ?? 0) - Number(row.refund_cents ?? 0) - Number(row.chargeback_cents ?? 0)) / 100
        : null;
      // Fallback (non-admin / RPC error): sum of active enrollments.
      const enrollmentRevenue = (enrollments.data ?? []).reduce((s, e) => s + (e.amount_eur ?? 0), 0);
      return {
        totalStudents:       students.count ?? 0,
        totalRevenue:        ledgerRevenue ?? enrollmentRevenue,
        pendingVerifications:verifications.count ?? 0,
        activeSubscriptions: subscriptions.count ?? 0,
      };
    },
  });
}

/* ── Public: live schedule/instructor data for a single course ── */
export function useCourseSchedule(courseId: string) {
  return useQuery({
    enabled: !!courseId,
    queryKey: ["ssra-course-schedule", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_courses")
        .select("id, title, start_date, start_time, duration, end_date, instructor_name, course_format, price_eur")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ── Course capacity & waitlist (public) ── */
export function useCourseCapacity(courseId: string) {
  return useQuery({
    enabled: !!courseId,
    queryKey: ["ssra-course-capacity", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ssra_courses") as any)
        .select("id, capacity, enrolled_count, waitlist_enabled, registration_open")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        capacity: number;
        enrolled_count: number;
        waitlist_enabled: boolean;
        registration_open: boolean;
      } | null;
    },
  });
}

export function useJoinWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase.from("ssra_waitlist" as never) as any)
        .insert({ user_id: user.id, course_id: courseId, status: "waiting" });
      if (error) {
        if (error.code === "23505") throw new Error("You are already on the waitlist for this course.");
        throw error;
      }
    },
    onSuccess: (_d, courseId) => {
      qc.invalidateQueries({ queryKey: ["ssra-waitlist-status", courseId] });
      qc.invalidateQueries({ queryKey: ["ssra-admin-waitlist"] });
    },
  });
}

export function useCoursesCapacityMap() {
  return useQuery({
    queryKey: ["ssra-courses-capacity-map"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ssra_courses") as any)
        .select("id, capacity, enrolled_count, waitlist_enabled, registration_open");
      if (error) throw error;
      const map: Record<string, { isFull: boolean; seatsLeft: number; waitlistEnabled: boolean }> = {};
      for (const c of data ?? []) {
        const cap = c.capacity ?? 50;
        const enrolled = c.enrolled_count ?? 0;
        map[c.id] = {
          isFull: enrolled >= cap,
          seatsLeft: Math.max(0, cap - enrolled),
          waitlistEnabled: !!c.waitlist_enabled,
        };
      }
      return map;
    },
  });
}

export function useMyWaitlistStatus(courseId: string) {
  return useQuery({
    enabled: !!courseId,
    queryKey: ["ssra-waitlist-status", courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await (supabase.from("ssra_waitlist" as never) as any)
        .select("id, position, status, created_at")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; position: number; status: string; created_at: string } | null;
    },
  });
}

/* ── Fetch enrollment by Paddle enrollment ID (primary — payment-success page) ── */
export function useEnrollmentById(enrollmentId: string) {
  return useQuery({
    enabled: !!enrollmentId,
    queryKey: ["ssra-enrollment-by-id", enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q: any) => (q?.state?.data?.status === "active" ? false : 2500),
  });
}

/* ── Fetch enrollment by Stripe session id (legacy fallback) ── */
export function useEnrollmentBySession(sessionId: string) {
  return useQuery({
    enabled: !!sessionId,
    queryKey: ["ssra-enrollment-by-session", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q: any) => (q?.state?.data ? false : 2500),
  });
}


/* ── Operational health: admin-level alerts ── */
export function useOperationalAlerts() {
  return useQuery({
    queryKey: ["ssra-operational-alerts"],
    staleTime: 300_000,
    queryFn: async () => {
      const now = new Date();
      const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [coursesRes, sessionsRes, credsRes, waitlistRes] = await Promise.all([
        supabase.from("ssra_courses").select("id, title, is_active, enrolled_count, capacity, registration_open").eq("is_active", true),
        supabase.from("ssra_sessions").select("id, course_id, title, scheduled_at, is_cancelled")
          .eq("is_cancelled", false)
          .gte("scheduled_at", now.toISOString())
          .lte("scheduled_at", in30d.toISOString()),
        supabase.from("ssra_session_credentials" as never).select("session_id"),
        supabase.from("ssra_waitlist").select("course_id").eq("status", "waiting"),
      ]);

      const courses = coursesRes.data ?? [];
      const sessions = (sessionsRes.data ?? []) as any[];
      const credsSet = new Set<string>(((credsRes.data ?? []) as any[]).map((r: any) => r.session_id));
      const waitlist = waitlistRes.data ?? [];

      const courseSessionCount = new Map<string, number>();
      const courseMissingZoom = new Map<string, string[]>();

      for (const s of sessions) {
        courseSessionCount.set(s.course_id, (courseSessionCount.get(s.course_id) ?? 0) + 1);
        if (!credsSet.has(s.id)) {
          const list = courseMissingZoom.get(s.course_id) ?? [];
          list.push(s.title);
          courseMissingZoom.set(s.course_id, list);
        }
      }

      const waitlistByCourse = new Map<string, number>();
      for (const w of waitlist) {
        waitlistByCourse.set(w.course_id, (waitlistByCourse.get(w.course_id) ?? 0) + 1);
      }

      const alerts: Array<{ level: "warn" | "info"; message: string; href?: string }> = [];

      for (const c of courses) {
        if ((courseSessionCount.get(c.id) ?? 0) === 0) {
          alerts.push({ level: "warn", message: `"${c.title}" has no sessions scheduled in the next 30 days.`, href: "/ssra-admin/sessions" });
        }
        const missingZoom = courseMissingZoom.get(c.id) ?? [];
        if (missingZoom.length > 0) {
          alerts.push({ level: "warn", message: `${missingZoom.length} session(s) in "${c.title}" are missing a Zoom link.`, href: "/ssra-admin/sessions" });
        }
        const wCount = waitlistByCourse.get(c.id) ?? 0;
        if (wCount > 0 && c.enrolled_count < c.capacity) {
          alerts.push({ level: "info", message: `${wCount} student(s) on waitlist for "${c.title}" — seats are now available.`, href: "/ssra-admin/waitlist" });
        }
      }

      return alerts;
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   BATCH MANAGEMENT
   ═══════════════════════════════════════════════════════════ */

export function useAdminBatches(courseId?: string) {
  return useQuery({
    queryKey: ["ssra-admin-batches", courseId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any).from("ssra_batches").select("*, ssra_courses(title)").order("start_date", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batch: Record<string, unknown>) => {
      const { id, ...rest } = batch;
      const db = (supabase as any).from("ssra_batches");
      if (id) {
        const { error } = await db.update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-batches"] }),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ssra_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-batches"] }),
  });
}

export function useBatchReport() {
  return useQuery({
    queryKey: ["ssra-batch-report"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ssra_batch_report").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        batch_id: string; batch_name: string; batch_status: string;
        start_date: string | null; end_date: string | null;
        capacity: number; enrolled_count: number;
        course_id: string; course_name: string;
        total_enrollments: number; active_enrollments: number;
        avg_attendance_pct: number; total_revenue_eur: number; certificates_issued: number;
      }>;
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   HOMEWORK / GRADING
   ═══════════════════════════════════════════════════════════ */

export function useAdminHomework(courseId?: string, status?: string) {
  return useQuery({
    queryKey: ["ssra-admin-homework", courseId ?? "all", status ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("ssra_homework_submissions")
        .select("*, ssra_course_materials(title, due_date), ssra_courses(title), ssra_profiles(full_name, email)")
        .order("submitted_at", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInstructorHomework(courseId?: string, status?: string) {
  return useQuery({
    queryKey: ["ssra-instructor-homework", courseId ?? "all", status ?? "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Scope to courses this instructor is actually assigned to.
      const { data: assignments } = await (supabase as any)
        .from("ssra_instructor_assignments")
        .select("course_id")
        .eq("instructor_id", user.id);
      const assignedCourseIds = (assignments ?? []).map((a: any) => a.course_id as string);
      if (assignedCourseIds.length === 0) return [];

      // If the caller requests a specific course, verify they're assigned to it.
      const allowedCourseIds = courseId
        ? assignedCourseIds.filter((id) => id === courseId)
        : assignedCourseIds;
      if (allowedCourseIds.length === 0) return [];

      let q = (supabase as any)
        .from("ssra_homework_submissions")
        .select("*, ssra_course_materials(title, due_date), ssra_courses(title), ssra_profiles(full_name, email)")
        .in("course_id", allowedCourseIds)
        .order("submitted_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGradeHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, grade, feedback }: { id: string; grade: number; feedback?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("ssra_homework_submissions").update({
        grade,
        feedback: feedback ?? null,
        graded_by: user?.id ?? null,
        graded_at: new Date().toISOString(),
        status: "graded",
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-homework"] });
      qc.invalidateQueries({ queryKey: ["ssra-instructor-homework"] });
      qc.invalidateQueries({ queryKey: ["ssra-my-homework"] });
    },
  });
}

export function useMyHomework(courseId?: string) {
  return useQuery({
    queryKey: ["ssra-my-homework", courseId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("ssra_homework_submissions")
        .select("*, ssra_course_materials(title, material_type, due_date, description), ssra_courses(title)")
        .order("submitted_at", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      materialId, courseId, batchId, fileUrl, storagePath, textContent,
    }: { materialId: string; courseId: string; batchId?: string; fileUrl?: string; storagePath?: string; textContent?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("ssra_homework_submissions").upsert({
        material_id:  materialId,
        user_id:      user.id,
        course_id:    courseId,
        batch_id:     batchId ?? null,
        file_url:     fileUrl ?? null,
        storage_path: storagePath ?? null,
        text_content: textContent ?? null,
        status:       "submitted",
        submitted_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }, { onConflict: "material_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-my-homework"] });
      qc.invalidateQueries({ queryKey: ["ssra-my-homework-assignments"] });
      qc.invalidateQueries({ queryKey: ["ssra-instructor-homework"] });
    },
  });
}

/**
 * Lists all homework ASSIGNMENTS (from ssra_materials, type='homework') for
 * courses the student is actively enrolled in or subscribed to, joined with
 * the student's submission row (if any).
 */
export function useMyHomeworkAssignments() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["ssra-my-homework-assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [enrRes, subRes] = await Promise.all([
        (supabase as any).from("ssra_enrollments")
          .select("course_id").eq("user_id", user!.id).eq("status", "active"),
        (supabase as any).from("ssra_subscriptions")
          .select("course_id").eq("user_id", user!.id).in("status", ["active", "trialing"]),
      ]);
      const courseIds = Array.from(new Set([
        ...((enrRes.data ?? []) as any[]).map((r) => r.course_id),
        ...((subRes.data ?? []) as any[]).map((r) => r.course_id),
      ].filter(Boolean)));
      if (courseIds.length === 0) return [] as any[];

      const { data: materials, error: mErr } = await (supabase as any)
        .from("ssra_materials")
        .select("id, course_id, title, description, due_date, is_visible, material_type, ssra_courses(title)")
        .in("course_id", courseIds)
        .eq("material_type", "homework")
        .eq("is_visible", true)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (mErr) throw mErr;

      const materialIds = ((materials ?? []) as any[]).map((m) => m.id);
      if (materialIds.length === 0) return [];

      const { data: subs } = await (supabase as any)
        .from("ssra_homework_submissions")
        .select("*")
        .eq("user_id", user!.id)
        .in("material_id", materialIds);
      const subByMat = new Map<string, any>(((subs ?? []) as any[]).map((s) => [s.material_id, s]));

      const now = Date.now();
      return ((materials ?? []) as any[]).map((m) => {
        const sub = subByMat.get(m.id) ?? null;
        let status: string = sub?.status ?? "missing";
        if (!sub && m.due_date && new Date(m.due_date).getTime() < now) status = "missing";
        return {
          material_id:  m.id,
          course_id:    m.course_id,
          title:        m.title,
          description:  m.description,
          due_date:     m.due_date,
          course_title: m.ssra_courses?.title ?? null,
          submission:   sub,
          status,
        };
      });
    },
  });
}

/** Generate a signed download URL for a homework submission file. */
export async function getHomeworkSignedUrl(storagePath: string, expiresInSec = 300) {
  const { data, error } = await supabase.storage
    .from("homework-submissions")
    .createSignedUrl(storagePath, expiresInSec);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

/* ═══════════════════════════════════════════════════════════
   FRAUD DETECTION
   ═══════════════════════════════════════════════════════════ */

export function useFraudFlags(resolved?: boolean) {
  return useQuery({
    queryKey: ["ssra-fraud-flags", resolved],
    queryFn: async () => {
      let q = (supabase as any)
        .from("ssra_fraud_flags")
        .select("*, ssra_profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (resolved !== undefined) q = q.eq("resolved", resolved);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveFraudFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("ssra_fraud_flags").update({
        resolved:        true,
        resolved_by:     user?.id ?? null,
        resolved_at:     new Date().toISOString(),
        resolution_note: note ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-fraud-flags"] }),
  });
}

export function useSessionAccessLog(sessionId?: string, userId?: string) {
  return useQuery({
    queryKey: ["ssra-session-access-log", sessionId ?? "all", userId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any)
        .from("ssra_session_access_log")
        .select("*")
        .order("accessed_at", { ascending: false })
        .limit(200);
      if (sessionId) q = q.eq("session_id", sessionId);
      if (userId)    q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   STUDENT PROGRESS VIEW
   ═══════════════════════════════════════════════════════════ */

export function useStudentProgress(courseId?: string) {
  return useQuery({
    queryKey: ["ssra-student-progress", courseId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any).from("ssra_student_progress").select("*").order("attendance_pct", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyProgress(courseId?: string) {
  return useQuery({
    queryKey: ["ssra-my-progress", courseId ?? "all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let q = (supabase as any).from("ssra_student_progress").select("*").eq("user_id", user.id);
      if (courseId) q = q.eq("course_id", courseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   MONITORING — SERVICE HEALTH, FAILED OPS, WEBHOOK EVENTS
   ═══════════════════════════════════════════════════════════ */

export function useServiceHealth() {
  return useQuery({
    queryKey: ["ssra-service-health"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await supabase.functions.invoke("health-check", { method: "GET" } as any);
      if (res.error) throw new Error(res.error.message);
      return res.data as {
        status: "ok" | "degraded" | "down";
        services: Record<string, { status: string; latencyMs?: number; detail?: string }>;
        metrics: {
          failedEmails24h: number;
          dlqEmails24h: number;
          enrollments24h: number;
          webhookSuccess24h: number;
          webhookFailed24h: number;
        };
        responseTimeMs: number;
        timestamp: string;
      };
    },
  });
}

export function useFailedEmails(limit = 100) {
  return useQuery({
    queryKey: ["ssra-failed-emails", limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_send_log")
        .select("id, recipient_email, template_name, subject, status, error_message, retry_count, created_at, sent_at")
        .in("status", ["failed", "bounced", "dlq"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        recipient_email: string;
        template_name: string;
        subject: string | null;
        status: string;
        error_message: string | null;
        retry_count: number;
        created_at: string;
        sent_at: string | null;
      }>;
    },
  });
}

export function useStaleEnrollments(staleHours = 2, limit = 100) {
  return useQuery({
    queryKey: ["ssra-stale-enrollments", staleHours, limit],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("ssra_enrollments")
        .select("id, user_id, course_id, status, amount_eur, course_title_snapshot, student_name_snapshot, student_email_snapshot, created_at, stripe_payment_intent")
        .eq("status", "pending")
        .lt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        user_id: string;
        course_id: string;
        status: string;
        amount_eur: number | null;
        course_title_snapshot: string | null;
        student_name_snapshot: string | null;
        student_email_snapshot: string | null;
        created_at: string;
        stripe_payment_intent: string | null;
      }>;
    },
  });
}

export function useWebhookEvents(limit = 200) {
  return useQuery({
    queryKey: ["ssra-webhook-events", limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ssra_webhook_events")
        .select("id, event_type, event_id, environment, status, error_message, processed_at")
        .order("processed_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{
        id: string;
        event_type: string;
        event_id: string | null;
        environment: string;
        status: "processed" | "failed" | "skipped";
        error_message: string | null;
        processed_at: string;
      }>;
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   CRON JOB HEALTH — detect silently dead pg_cron schedules
   ═══════════════════════════════════════════════════════════ */

export interface CronHealth {
  lastReconciliationAt: string | null;
  reconciliationAgeHours: number | null;
  reconciliationStale: boolean;       // no completed run in > 25 h
  lastReconciliationStatus: string | null;
  stuckWaitlistEmails: number;        // promoted > 1 h ago, email never sent
  waitlistCronStale: boolean;
}

export function useCronHealth() {
  return useQuery({
    queryKey: ["ssra-cron-health"],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<CronHealth> => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Reconciliation is now an on-demand check (see AdminReconciliation.tsx),
      // not a nightly cron writing ssra_reconciliation_reports — that table is
      // not provisioned in production (finding H3, 2026-06-13). We therefore no
      // longer treat a missing report as "stale"; only the waitlist cron, which
      // genuinely runs every 15 min, is health-checked here.
      const waitlistRes = await (supabase as any)
        .from("ssra_waitlist")
        .select("id", { count: "exact", head: true })
        .eq("status", "notified")
        .eq("email_sent", false)
        .lt("notified_at", oneHourAgo);

      const stuckEmails = waitlistRes.count ?? 0;

      return {
        lastReconciliationAt:     null,
        reconciliationAgeHours:   null,
        reconciliationStale:      false,
        lastReconciliationStatus: null,
        stuckWaitlistEmails:      stuckEmails,
        waitlistCronStale:        stuckEmails > 0,
      };
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM HEALTH
   ═══════════════════════════════════════════════════════════ */

export function useSystemHealth() {
  return useQuery({
    queryKey: ["ssra-system-health"],
    staleTime: 60_000,
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [enrollRes, fraudRes, pendingHwRes, unreadNotifRes, waitlistRes] = await Promise.all([
        supabase.from("ssra_enrollments").select("id", { count: "exact", head: true }).gte("enrolled_at", since24h),
        (supabase as any).from("ssra_fraud_flags").select("id, severity").eq("resolved", false),
        (supabase as any).from("ssra_homework_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        (supabase as any).from("ssra_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
        supabase.from("ssra_waitlist").select("id", { count: "exact", head: true }).eq("status", "waiting"),
      ]);

      const fraudData = fraudRes.data ?? [];
      const criticalFraud = fraudData.filter((f: any) => f.severity === "critical").length;
      const highFraud     = fraudData.filter((f: any) => f.severity === "high").length;
      const openFraudTotal = fraudData.length;

      return {
        enrollments24h:      enrollRes.count    ?? 0,
        openFraudFlags:      openFraudTotal,
        criticalFraud,
        highFraud,
        pendingHomework:     pendingHwRes.count  ?? 0,
        unreadNotifications: unreadNotifRes.count ?? 0,
        studentsOnWaitlist:  waitlistRes.count   ?? 0,
        healthScore: Math.max(0, 100 - (criticalFraud * 25) - (highFraud * 10) - (openFraudTotal * 2)),
      };
    },
  });
}
