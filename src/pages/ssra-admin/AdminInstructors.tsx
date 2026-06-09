import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Trash2, Loader2, Search, BookOpen, UserCheck, Send, Mail, Bell } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function useInstructors() {
  return useQuery({
    queryKey: ["ssra-instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email, created_at")
        .eq("role", "instructor")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInstructorAssignments() {
  return useQuery({
    queryKey: ["ssra-instructor-assignments-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_instructor_assignments" as never) as any)
        .select("id, instructor_id, course_id, assigned_at, is_active, ssra_courses(id, title)")
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useCoursesList() {
  return useQuery({
    queryKey: ["ssra-admin-courses-for-instructors"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_courses").select("id, title").order("sort_order");
      return data ?? [];
    },
  });
}

function useStudentsList(search: string) {
  return useQuery({
    queryKey: ["ssra-search-instructors-candidates", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("ssra_profiles")
        .select("id, full_name, email, role")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .in("role", ["student", "instructor"])
        .limit(10);
      return data ?? [];
    },
  });
}

function usePromoteToInstructor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("ssra_profiles").update({ role: "instructor" }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-instructors"] });
      qc.invalidateQueries({ queryKey: ["ssra-search-instructors-candidates"] });
    },
  });
}

function useDemoteToStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("ssra_profiles").update({ role: "student" }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-instructors"] });
    },
  });
}

function useAssignAndNotify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ instructorId, courseIds, notify }: { instructorId: string; courseIds: string[]; notify: boolean }) => {
      const { data, error } = await supabase.functions.invoke("notify-instructor-assignment", {
        body: { instructorId, courseIds, notify },
      });
      if (error) throw error;
      return data as { assigned: number; notified: number; emailsSent: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-instructor-assignments-all"] }),
  });
}

function useUnassignCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await (supabase.from("ssra_instructor_assignments" as never) as any)
        .update({ is_active: false })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-instructor-assignments-all"] }),
  });
}

export default function AdminInstructors() {
  const { toast } = useToast();
  const { data: instructors = [], isLoading } = useInstructors();
  const { data: assignments = [] }            = useInstructorAssignments();
  const { data: courses = [] }                = useCoursesList();
  const [search, setSearch]                   = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [selectedCourseIds, setSelectedCourseIds]   = useState<string[]>([]);
  const [notifyStudents, setNotifyStudents]         = useState(true);
  const { data: candidates = [] }             = useStudentsList(search);

  const promote      = usePromoteToInstructor();
  const demote       = useDemoteToStudent();
  const assignNotify = useAssignAndNotify();
  const unassign     = useUnassignCourse();

  const handlePromote = async (userId: string, name: string) => {
    await promote.mutateAsync(userId);
    toast({ title: `${name} promoted to Instructor` });
  };

  const handleDemote = async (userId: string, name: string) => {
    await demote.mutateAsync(userId);
    toast({ title: `${name} moved back to Student` });
  };

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssignAndNotify = async () => {
    if (!selectedInstructor || selectedCourseIds.length === 0) return;
    try {
      const res = await assignNotify.mutateAsync({
        instructorId: selectedInstructor,
        courseIds: selectedCourseIds,
        notify: notifyStudents,
      });
      toast({
        title: `Assigned to ${res.assigned} course${res.assigned === 1 ? "" : "s"}`,
        description: notifyStudents
          ? `Notified ${res.notified} student${res.notified === 1 ? "" : "s"} (${res.emailsSent} email${res.emailsSent === 1 ? "" : "s"} sent).`
          : "Students were not notified.",
      });
      setSelectedCourseIds([]);
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e.message, variant: "destructive" });
    }
  };

  const instructorAssignments = (instructorId: string) =>
    (assignments as any[]).filter((a: any) => a.instructor_id === instructorId);

  // courses currently assigned (active) to the selected instructor
  const alreadyAssignedIds = useMemo(() => {
    if (!selectedInstructor) return new Set<string>();
    return new Set(
      (assignments as any[])
        .filter((a: any) => a.instructor_id === selectedInstructor)
        .map((a: any) => a.course_id)
    );
  }, [assignments, selectedInstructor]);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Instructor Management</h1>
          <p className="text-slate-500 text-sm mt-1">Promote students to instructors, assign courses, and notify the enrolled students.</p>
        </div>

        {/* Promote a user */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" /> Promote User to Instructor
          </h2>
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {search.length >= 2 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-w-sm">
              {(candidates as any[]).length === 0
                ? <div className="px-4 py-3 text-sm text-slate-400">No results</div>
                : (candidates as any[]).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{c.full_name ?? "—"}</div>
                      <div className="text-xs text-slate-400">{c.email} · <span className="capitalize">{c.role}</span></div>
                    </div>
                    {c.role !== "instructor" && (
                      <button
                        onClick={() => handlePromote(c.id, c.full_name ?? c.email)}
                        disabled={promote.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
                      >
                        Promote
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Assign courses + notify */}
        {instructors.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Assign Courses &amp; Notify Students
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Instructor</label>
              <select
                value={selectedInstructor}
                onChange={(e) => { setSelectedInstructor(e.target.value); setSelectedCourseIds([]); }}
                className="w-full max-w-sm text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select instructor…</option>
                {(instructors as any[]).map((i: any) => (
                  <option key={i.id} value={i.id}>{i.full_name ?? i.email}</option>
                ))}
              </select>
            </div>

            {selectedInstructor && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600">
                      Courses to assign ({selectedCourseIds.length} selected)
                    </label>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds(
                          (courses as any[])
                            .filter((c: any) => !alreadyAssignedIds.has(c.id))
                            .map((c: any) => c.id)
                        )}
                        className="text-blue-600 hover:underline"
                      >
                        Select all unassigned
                      </button>
                      <span className="text-slate-200">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds([])}
                        className="text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                    {(courses as any[]).map((c: any) => {
                      const isAssigned = alreadyAssignedIds.has(c.id);
                      const isChecked  = selectedCourseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? "border-blue-300 bg-blue-50"
                              : isAssigned
                                ? "border-emerald-200 bg-emerald-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCourse(c.id)}
                            className="mt-0.5 accent-blue-600"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{c.title}</div>
                            {isAssigned && (
                              <div className="text-[11px] text-emerald-700 mt-0.5">Already assigned</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStudents}
                    onChange={(e) => setNotifyStudents(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-blue-600" /> Notify enrolled students
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Sends an in-app notification + branded email to every active student in the selected courses.
                    </div>
                  </div>
                </label>

                <div className="flex justify-end">
                  <button
                    onClick={handleAssignAndNotify}
                    disabled={selectedCourseIds.length === 0 || assignNotify.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] disabled:opacity-50"
                  >
                    {assignNotify.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                    {notifyStudents ? "Assign & Notify Students" : "Assign Courses"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Instructor list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : instructors.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No instructors yet</h3>
            <p className="text-sm text-slate-500 mt-1">Search for a student above and promote them to instructor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(instructors as any[]).map((instructor: any) => {
              const myAssignments = instructorAssignments(instructor.id);
              return (
                <div key={instructor.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                        {(instructor.full_name ?? instructor.email ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{instructor.full_name ?? "—"}</div>
                        <div className="text-xs text-slate-400">{instructor.email}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Joined {new Date(instructor.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDemote(instructor.id, instructor.full_name ?? instructor.email)}
                      disabled={demote.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 font-medium"
                    >
                      Demote
                    </button>
                  </div>

                  {myAssignments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {myAssignments.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-700">{(a.ssra_courses as any)?.title}</span>
                          <button
                            onClick={async () => { await unassign.mutateAsync(a.id); toast({ title: "Unassigned" }); }}
                            className="text-slate-300 hover:text-red-500 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {myAssignments.length === 0 && (
                    <p className="text-xs text-slate-400 mt-3">No courses assigned yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
