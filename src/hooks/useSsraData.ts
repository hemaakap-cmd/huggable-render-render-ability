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

/* ── Admin: paginated students ── */
export function useAdminStudents(search = "", page = 0, pageSize = 25) {
  return useQuery({
    queryKey: ["ssra-admin-students", search, page, pageSize],
    queryFn: async () => {
      const from = page * pageSize;
      const to   = from + pageSize - 1;
      let q = supabase
        .from("ssra_profiles")
        .select("*", { count: "exact" })
        .eq("role", "student")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error, count } = await q;
      if (error) throw error;

      const rows = data ?? [];
      const ids = rows.map((s) => s.id);
      if (ids.length === 0) return { rows, total: count ?? 0 };

      const [enrollments, subscriptions] = await Promise.all([
        supabase.from("ssra_enrollments").select("user_id").in("user_id", ids),
        supabase.from("ssra_subscriptions").select("user_id, status, created_at").in("user_id", ids).order("created_at", { ascending: false }),
      ]);
      if (enrollments.error) throw enrollments.error;
      if (subscriptions.error) throw subscriptions.error;

      const enrollmentCounts = new Map<string, number>();
      for (const e of enrollments.data ?? []) {
        if (!e.user_id) continue;
        enrollmentCounts.set(e.user_id, (enrollmentCounts.get(e.user_id) ?? 0) + 1);
      }

      const latestSubscription = new Map<string, { status: string }>();
      for (const s of subscriptions.data ?? []) {
        if (!s.user_id) continue;
        if (!latestSubscription.has(s.user_id)) latestSubscription.set(s.user_id, { status: s.status });
      }

      return {
        rows: rows.map((s) => {
          const subscription = latestSubscription.get(s.id);
          return {
            ...s,
            ssra_enrollments: [{ count: enrollmentCounts.get(s.id) ?? 0 }],
            ssra_subscriptions: subscription ? [subscription] : [],
          };
        }),
        total: count ?? 0,
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
      const { error } = await supabase.from("ssra_courses").update({ price_hidden, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-courses"] }),
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

      const { data, error } = await supabase
        .from("ssra_sessions")
        .select("*, ssra_courses(title)")
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

/* ── Fetch enrollment by Stripe session id (for confirmation page) ── */
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

      const [coursesRes, sessionsRes, waitlistRes] = await Promise.all([
        supabase.from("ssra_courses").select("id, title, is_active, enrolled_count, capacity, registration_open").eq("is_active", true),
        supabase.from("ssra_sessions").select("id, course_id, title, zoom_link, scheduled_at, is_cancelled")
          .eq("is_cancelled", false)
          .gte("scheduled_at", now.toISOString())
          .lte("scheduled_at", in30d.toISOString()),
        supabase.from("ssra_waitlist").select("course_id").eq("status", "waiting"),
      ]);

      const courses = coursesRes.data ?? [];
      const sessions = sessionsRes.data ?? [];
      const waitlist = waitlistRes.data ?? [];

      const courseSessionCount = new Map<string, number>();
      const courseMissingZoom = new Map<string, string[]>();

      for (const s of sessions) {
        courseSessionCount.set(s.course_id, (courseSessionCount.get(s.course_id) ?? 0) + 1);
        if (!s.zoom_link) {
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
        .select("*, ssra_course_materials(title, course_id, due_date), ssra_profiles(full_name, email)")
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
      let q = (supabase as any)
        .from("ssra_homework_submissions")
        .select("*, ssra_course_materials(title, course_id, due_date), ssra_profiles(full_name, email)")
        .order("submitted_at", { ascending: false });
      if (courseId) q = q.eq("course_id", courseId);
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
        .select("*, ssra_course_materials(title, material_type, due_date, description)")
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
      materialId, courseId, batchId, fileUrl, textContent,
    }: { materialId: string; courseId: string; batchId?: string; fileUrl?: string; textContent?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("ssra_homework_submissions").upsert({
        material_id:  materialId,
        user_id:      user.id,
        course_id:    courseId,
        batch_id:     batchId ?? null,
        file_url:     fileUrl ?? null,
        text_content: textContent ?? null,
        status:       "submitted",
        submitted_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      }, { onConflict: "material_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-my-homework"] }),
  });
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
        (supabase as any).from("ssra_notifications").select("id", { count: "exact", head: true }).eq("read", false),
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
