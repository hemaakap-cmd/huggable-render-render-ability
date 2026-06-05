import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Trash2, Loader2, Search, BookOpen, UserCheck } from "lucide-react";
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

function useAssignCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ instructorId, courseId }: { instructorId: string; courseId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("ssra_instructor_assignments" as never) as any)
        .upsert(
          { instructor_id: instructorId, course_id: courseId, assigned_by: user?.id, is_active: true },
          { onConflict: "instructor_id,course_id" },
        );
      if (error) throw error;
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
  const [selectedCourse, setSelectedCourse]         = useState("");
  const { data: candidates = [] }             = useStudentsList(search);

  const promote   = usePromoteToInstructor();
  const demote    = useDemoteToStudent();
  const assign    = useAssignCourse();
  const unassign  = useUnassignCourse();

  const handlePromote = async (userId: string, name: string) => {
    await promote.mutateAsync(userId);
    toast({ title: `${name} promoted to Instructor` });
  };

  const handleDemote = async (userId: string, name: string) => {
    await demote.mutateAsync(userId);
    toast({ title: `${name} moved back to Student` });
  };

  const handleAssign = async () => {
    if (!selectedInstructor || !selectedCourse) return;
    await assign.mutateAsync({ instructorId: selectedInstructor, courseId: selectedCourse });
    toast({ title: "Course assigned to instructor" });
    setSelectedCourse("");
  };

  const instructorAssignments = (instructorId: string) =>
    (assignments as any[]).filter((a: any) => a.instructor_id === instructorId);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Instructor Management</h1>
          <p className="text-slate-500 text-sm mt-1">Promote students to instructors and assign them to courses.</p>
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

        {/* Assign courses */}
        {instructors.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" /> Assign Course to Instructor
            </h2>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select instructor</option>
                {(instructors as any[]).map((i: any) => (
                  <option key={i.id} value={i.id}>{i.full_name ?? i.email}</option>
                ))}
              </select>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="flex-1 min-w-48 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select course</option>
                {(courses as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!selectedInstructor || !selectedCourse || assign.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] disabled:opacity-50"
              >
                {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Assign
              </button>
            </div>
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
