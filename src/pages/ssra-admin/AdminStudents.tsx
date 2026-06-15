import { useState, useMemo } from "react";
import { Search, Users, Mail, Globe2, Eye, ChevronLeft, ChevronRight, Download, FileSpreadsheet, TrendingUp, Phone, MapPin, Calendar, BookOpen, Edit2, Trash2, X, Loader2, Ban, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminStudents, useLeadStudentStats, useAdminCourses, useUpdateStudent, useDeleteStudent, useCancelEnrollment } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/lib/exportUtils";

type SubFilter = "all" | "active" | "none";
const PAGE_SIZE = 25;

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  date_of_birth: string | null;
  degree: string | null;
  german_level: string | null;
  created_at: string;
  ssra_enrollments: { count: number }[];
  ssra_active_enrollments: number;
  ssra_unique_courses: number;
  ssra_course_ids: string[];
  ssra_first_enrolled_at: string | null;
  ssra_subscriptions: { status: string }[];
};

const exportColumns: ExportColumn<StudentRow>[] = [
  { header: "Full Name",          accessor: (r) => r.full_name ?? "" },
  { header: "Email",              accessor: (r) => r.email ?? "" },
  { header: "Phone",              accessor: (r) => r.phone_number ?? "" },
  { header: "Country",            accessor: (r) => r.country ?? "" },
  { header: "City",               accessor: (r) => r.city ?? "" },
  { header: "Address",            accessor: (r) => r.address ?? "" },
  { header: "Date of Birth",      accessor: (r) => r.date_of_birth ?? "" },
  { header: "Degree",             accessor: (r) => r.degree ?? "" },
  { header: "German Level",       accessor: (r) => r.german_level ?? "" },
  { header: "Enrollments",        accessor: (r) => r.ssra_enrollments?.[0]?.count ?? 0 },
  { header: "Active Enrollments", accessor: (r) => r.ssra_active_enrollments ?? 0 },
  { header: "Unique Courses",     accessor: (r) => r.ssra_unique_courses ?? 0 },
  { header: "Course IDs",         accessor: (r) => (r.ssra_course_ids ?? []).join("; ") },
  { header: "Subscription",       accessor: (r) => r.ssra_subscriptions?.[0]?.status ?? "" },
  { header: "First Enrolled",     accessor: (r) => r.ssra_first_enrolled_at ? new Date(r.ssra_first_enrolled_at).toISOString().slice(0, 10) : "" },
  { header: "Joined",             accessor: (r) => new Date(r.created_at).toISOString().slice(0, 10) },
];

export default function AdminStudents() {
  const [search, setSearch]       = useState("");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage]           = useState(0);
  const { data, isLoading }       = useAdminStudents(search, page, PAGE_SIZE);
  const { data: stats }           = useLeadStudentStats();
  const { data: courses = [] }    = useAdminCourses();
  const rows  = (data?.rows ?? []) as unknown as StudentRow[];
  const total = data?.total ?? 0;
  const { isSuperAdmin }          = useSsraAuth();
  const navigate                  = useNavigate();
  const { toast }                 = useToast();

  // Manage modal
  const [manage, setManage] = useState<StudentRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const cancelEnrollment = useCancelEnrollment();

  async function openManage(s: StudentRow) {
    setManage(s);
    setEditing(false);
    setDeleteConfirm(false);
    setEditForm({
      full_name: s.full_name ?? "",
      phone_number: s.phone_number ?? "",
      country: s.country ?? "",
      city: s.city ?? "",
      address: s.address ?? "",
      date_of_birth: s.date_of_birth ?? "",
      degree: s.degree ?? "",
      german_level: s.german_level ?? "",
    });
    setLoadingEnrollments(true);
    try {
      const { data } = await supabase
        .from("ssra_enrollments")
        .select("id, course_id, status, amount_eur, enrolled_at, course_title_snapshot")
        .eq("user_id", s.id)
        .order("enrolled_at", { ascending: false });
      setStudentEnrollments(data || []);
    } finally {
      setLoadingEnrollments(false);
    }
  }

  async function handleSaveStudent() {
    if (!manage) return;
    setSaving(true);
    try {
      await updateStudent.mutateAsync({ userId: manage.id, patch: editForm });
      toast({ title: "تم تحديث بيانات الطالب" });
      setEditing(false);
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleDeleteStudent() {
    if (!manage) return;
    setDeleting(true);
    try {
      await deleteStudent.mutateAsync({ userId: manage.id });
      toast({ title: "تم حذف الطالب نهائياً" });
      setManage(null);
      setDeleteConfirm(false);
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e.message, variant: "destructive" });
    } finally { setDeleting(false); }
  }

  async function handleCancelEnrollment(enrollmentId: string) {
    if (!confirm("إلغاء تسجيل الطالب من هذا الكورس؟")) return;
    try {
      await cancelEnrollment.mutateAsync({ enrollmentId });
      setStudentEnrollments((prev) => prev.map((e) => e.id === enrollmentId ? { ...e, status: "cancelled" } : e));
      toast({ title: "تم إلغاء التسجيل" });
    } catch (e: any) {
      toast({ title: "فشل الإلغاء", description: e.message, variant: "destructive" });
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (subFilter === "active" && s.ssra_subscriptions?.[0]?.status !== "active") return false;
      if (subFilter === "none" && s.ssra_subscriptions?.[0]?.status) return false;
      if (courseFilter !== "all" && !(s.ssra_course_ids ?? []).includes(courseFilter)) return false;
      const enrolledAt = s.ssra_first_enrolled_at;
      if (dateFrom && (!enrolledAt || new Date(enrolledAt) < new Date(dateFrom))) return false;
      if (dateTo && (!enrolledAt || new Date(enrolledAt) > new Date(dateTo + "T23:59:59"))) return false;
      return true;
    });
  }, [rows, subFilter, courseFilter, dateFrom, dateTo]);

  const stamp = new Date().toISOString().slice(0, 10);
  const onCSV  = () => exportToCSV(filtered, exportColumns, `ssra-students-${stamp}`);
  const onXLSX = () => exportToExcel(filtered, exportColumns, `ssra-students-${stamp}`, "Students");
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const courseTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses as any[]) m.set(c.id, c.title);
    return m;
  }, [courses]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-500" /> Students
            </h1>
            <p className="text-slate-500 text-sm mt-1">Paying customers with at least one enrollment.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCSV} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={onXLSX} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Students"     value={stats?.totalStudents ?? "—"} hint="At least 1 enrollment" />
          <StatCard label="New This Month"     value={stats?.newStudentsThisMonth ?? "—"} hint="Enrolled in current month" />
          <StatCard label="Conversion Rate"    value={stats ? `${stats.conversionRate.toFixed(1)}%` : "—"} hint="Leads → Students" icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} />
          <StatCard label="Revenue / Student"  value={stats ? `€${stats.revenuePerStudent.toFixed(0)}` : "—"} hint="Lifetime avg" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(["all", "active", "none"] as SubFilter[]).map((v) => (
                <button key={v} onClick={() => setSubFilter(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                    subFilter === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {v === "none" ? "No Sub" : v === "active" ? "Active Sub" : "All"}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white min-w-[180px]">
              <option value="all">All courses</option>
              {(courses as any[]).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <span className="mx-2 text-slate-200">|</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Enrolled between</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white" />
            <span className="text-slate-400">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white" />
            {(dateFrom || dateTo || courseFilter !== "all") && (
              <button onClick={() => { clearDates(); setCourseFilter("all"); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline">Clear</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <div className="text-slate-400 text-sm">No students match the current filters.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Contact</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Courses</th>
                    <th className="text-center px-4 py-3">Sub</th>
                    {isSuperAdmin && <th className="text-center px-4 py-3">View As</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => {
                    const subStatus = s.ssra_subscriptions?.[0]?.status;
                    const courseTitles = (s.ssra_course_ids ?? []).map((id) => courseTitleById.get(id) ?? id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-xs shrink-0">
                              {(s.full_name?.[0] ?? s.email?.[0] ?? "?").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{s.full_name ?? "—"}</div>
                              <div className="text-[11px] text-slate-400">{s.degree ?? "—"}</div>
                              {s.date_of_birth && (
                                <div className="text-[10px] text-slate-400">DOB: {new Date(s.date_of_birth).toLocaleDateString()}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600 flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {s.email ?? "—"}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {s.phone_number ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px]">
                          <div className="flex items-center gap-1"><Globe2 className="w-3 h-3 text-slate-400" /> {s.country ?? "—"}{s.city ? `, ${s.city}` : ""}</div>
                          {s.address && (
                            <div className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{s.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {courseTitles.length === 0 ? (
                              <span className="text-xs text-slate-300">—</span>
                            ) : courseTitles.map((t, i) => (
                              <span key={i} className="text-[10px] bg-[hsl(220,91%,54%)]/10 text-[hsl(220,91%,54%)] px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {s.ssra_enrollments?.[0]?.count ?? 0} enrollment(s) · {s.ssra_active_enrollments ?? 0} active
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {subStatus ? (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              subStatus === "active"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              subStatus === "past_due" ? "bg-red-50 text-red-700 border-red-200"             :
                              "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {subStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => navigate(`/ssra-admin/view-as/${s.id}`)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                              <Eye className="w-3 h-3" /> View as
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div>Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))} · {total} students</div>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: number | string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}
