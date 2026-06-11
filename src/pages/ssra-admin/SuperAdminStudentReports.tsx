import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, GraduationCap, Award, DollarSign, BookOpen, Layers,
  UserCog, Search, Download, FileSpreadsheet, Loader2, Crown,
  TrendingUp, Filter as FilterIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { Navigate } from "react-router-dom";

/* ───────────────────────── helpers ───────────────────────── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmtEUR = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(Number(n ?? 0));

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString() : "—";

function monthKey(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportXLSX(sheets: Record<string, Record<string, unknown>[]>, filename: string) {
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

/* ───────────────────────── data hook ───────────────────────── */
function useReportData() {
  return useQuery({
    queryKey: ["super-admin-student-reports"],
    queryFn: async () => {
      const [
        profilesR, enrollmentsR, certsR, attendanceR,
        sessionsR, coursesR, subsR, lastSeenR,
      ] = await Promise.all([
        supabase.from("ssra_profiles").select("id,full_name,email,country,role,created_at").order("created_at", { ascending: false }),
        supabase.from("ssra_enrollments").select("*").order("created_at", { ascending: false }),
        supabase.from("ssra_certificates").select("id,user_id,course_id,course_title,issued_at,revoked,certificate_code,grade").order("issued_at", { ascending: false }),
        supabase.from("ssra_session_attendance").select("user_id,session_id,attended_at"),
        supabase.from("ssra_sessions").select("id,course_id,scheduled_at,is_cancelled"),
        supabase.from("ssra_courses").select("id,title,instructor_name,price_eur,is_active,start_date,course_format,category"),
        supabase.from("ssra_subscriptions").select("user_id,course_id,status"),
        supabase.from("site_visitor_sessions").select("user_id,last_seen_at").not("user_id", "is", null).order("last_seen_at", { ascending: false }),
      ]);

      const err = profilesR.error || enrollmentsR.error || certsR.error || attendanceR.error
        || sessionsR.error || coursesR.error || subsR.error || lastSeenR.error;
      if (err) throw err;

      return {
        profiles:    profilesR.data ?? [],
        enrollments: enrollmentsR.data ?? [],
        certs:       certsR.data ?? [],
        attendance:  attendanceR.data ?? [],
        sessions:    sessionsR.data ?? [],
        courses:     coursesR.data ?? [],
        subs:        subsR.data ?? [],
        lastSeen:    lastSeenR.data ?? [],
      };
    },
    staleTime: 60_000,
  });
}

/* ───────────────────────── page ───────────────────────── */
export default function SuperAdminStudentReports() {
  const { isSuperAdmin, loading: authLoading } = useSsraAuth();
  const { data, isLoading, error } = useReportData();

  const [year,  setYear]  = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [course, setCourse] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [instructor, setInstructor] = useState<string>("all");
  const [search, setSearch] = useState("");

  /* derived data */
  const derived = useMemo(() => {
    if (!data) return null;
    const courseById = new Map(data.courses.map(c => [c.id, c]));
    const sessionsByCourse = new Map<string, typeof data.sessions>();
    data.sessions.forEach(s => {
      if (!s.course_id) return;
      const arr = sessionsByCourse.get(s.course_id) ?? [];
      arr.push(s);
      sessionsByCourse.set(s.course_id, arr);
    });
    const attendanceByUser = new Map<string, Set<string>>();
    data.attendance.forEach(a => {
      const set = attendanceByUser.get(a.user_id) ?? new Set();
      set.add(a.session_id);
      attendanceByUser.set(a.user_id, set);
    });
    const certByUserCourse = new Map<string, typeof data.certs[number]>();
    data.certs.forEach(c => {
      if (c.user_id && c.course_id) certByUserCourse.set(`${c.user_id}::${c.course_id}`, c);
    });
    const lastSeenByUser = new Map<string, string>();
    data.lastSeen.forEach(v => {
      if (v.user_id && !lastSeenByUser.has(v.user_id)) lastSeenByUser.set(v.user_id, v.last_seen_at);
    });
    const profileById = new Map(data.profiles.map(p => [p.id, p]));

    // Build student rows (one per enrollment)
    const rows = data.enrollments.map(e => {
      const p = e.user_id ? profileById.get(e.user_id) : null;
      const course = e.course_id ? courseById.get(e.course_id) : null;
      const totalSessions = (e.course_id ? sessionsByCourse.get(e.course_id)?.filter(s => !s.is_cancelled).length : 0) ?? 0;
      const attended = e.user_id ? (attendanceByUser.get(e.user_id)?.size ?? 0) : 0;
      const attendancePct = totalSessions > 0 ? Math.min(100, Math.round((attended / totalSessions) * 100)) : 0;
      const cert = e.user_id && e.course_id ? certByUserCourse.get(`${e.user_id}::${e.course_id}`) : null;
      const lastLogin = e.user_id ? lastSeenByUser.get(e.user_id) : null;

      return {
        enrollment_id:   e.id,
        user_id:         e.user_id,
        full_name:       e.student_name_snapshot || p?.full_name || "—",
        email:           e.student_email_snapshot || p?.email || "—",
        phone:           "—",
        country:         p?.country || "—",
        registered_at:   p?.created_at || null,
        enrolled_at:     e.enrolled_at || e.created_at,
        course_id:       e.course_id,
        course_title:    e.course_title_snapshot || course?.title || "—",
        instructor:      course?.instructor_name || e.instructor_snapshot || "—",
        batch_date:      e.start_date_snapshot || course?.start_date || null,
        payment_status:  e.status,
        amount_paid:     Number(e.amount_eur ?? 0),
        coupon:          "—",
        attendance_pct:  attendancePct,
        certificate:     cert ? (cert.revoked ? "Revoked" : cert.certificate_code) : "Not issued",
        last_login:      lastLogin,
        account_status:  p?.role ?? "—",
      };
    });

    return { rows, courseById };
  }, [data]);

  /* filtered rows */
  const filtered = useMemo(() => {
    if (!derived) return [];
    const q = search.trim().toLowerCase();
    return derived.rows.filter(r => {
      if (year !== "all" && (!r.enrolled_at || new Date(r.enrolled_at).getFullYear() !== Number(year))) return false;
      if (month !== "all" && (!r.enrolled_at || new Date(r.enrolled_at).getMonth() + 1 !== Number(month))) return false;
      if (course !== "all" && r.course_id !== course) return false;
      if (country !== "all" && r.country !== country) return false;
      if (instructor !== "all" && r.instructor !== instructor) return false;
      if (q && !`${r.full_name} ${r.email} ${r.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [derived, year, month, course, country, instructor, search]);

  /* overview cards */
  const overview = useMemo(() => {
    if (!data) return null;
    const students = data.profiles.filter(p => p.role === "student");
    const activeUserIds = new Set(data.enrollments.filter(e => e.status === "active").map(e => e.user_id));
    const revenue = data.enrollments.filter(e => e.status === "active" || e.paid_at)
      .reduce((acc, e) => acc + Number(e.amount_eur ?? 0), 0);
    const instructors = new Set(data.courses.map(c => c.instructor_name).filter(Boolean));
    return {
      students:    students.length,
      activeStudents: activeUserIds.size,
      enrollments: data.enrollments.length,
      revenue,
      certificates: data.certs.filter(c => !c.revoked).length,
      courses:     data.courses.filter(c => c.is_active).length,
      batches:     new Set(data.courses.map(c => `${c.id}-${c.start_date}`).filter(k => !k.endsWith("-null"))).size,
      instructors: instructors.size,
    };
  }, [data]);

  /* chart data — monthly trends */
  const charts = useMemo(() => {
    if (!derived) return null;
    const byMonth = new Map<string, { month: string; enrollments: number; revenue: number; certs: number; students: Set<string> }>();
    derived.rows.forEach(r => {
      const k = monthKey(r.enrolled_at);
      if (!k) return;
      const e = byMonth.get(k) ?? { month: k, enrollments: 0, revenue: 0, certs: 0, students: new Set<string>() };
      e.enrollments += 1;
      e.revenue += r.amount_paid;
      if (r.certificate !== "Not issued" && r.certificate !== "Revoked") e.certs += 1;
      if (r.user_id) e.students.add(r.user_id);
      byMonth.set(k, e);
    });
    const monthly = Array.from(byMonth.values())
      .map(e => ({ month: e.month, enrollments: e.enrollments, revenue: Math.round(e.revenue), certs: e.certs, students: e.students.size }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // cumulative student growth
    let cum = 0;
    const growth = monthly.map(m => ({ month: m.month, total: (cum += m.students) }));

    // enrollments per course
    const byCourse = new Map<string, number>();
    derived.rows.forEach(r => byCourse.set(r.course_title, (byCourse.get(r.course_title) ?? 0) + 1));
    const courseEnrollments = Array.from(byCourse, ([course, count]) => ({ course, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    // attendance trend per month (avg)
    const attMonth = new Map<string, { sum: number; n: number }>();
    derived.rows.forEach(r => {
      const k = monthKey(r.enrolled_at);
      if (!k) return;
      const e = attMonth.get(k) ?? { sum: 0, n: 0 };
      e.sum += r.attendance_pct; e.n += 1;
      attMonth.set(k, e);
    });
    const attendance = Array.from(attMonth, ([month, v]) => ({ month, pct: Math.round(v.sum / v.n) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { monthly, growth, courseEnrollments, attendance };
  }, [derived]);

  /* course reports */
  const courseReports = useMemo(() => {
    if (!data || !derived) return [];
    return data.courses.map(c => {
      const enrolled = derived.rows.filter(r => r.course_id === c.id);
      const revenue = enrolled.reduce((a, r) => a + r.amount_paid, 0);
      const certs   = enrolled.filter(r => r.certificate !== "Not issued" && r.certificate !== "Revoked").length;
      const avgAttendance = enrolled.length
        ? Math.round(enrolled.reduce((a, r) => a + r.attendance_pct, 0) / enrolled.length) : 0;
      return {
        course_id:   c.id,
        title:       c.title,
        instructor:  c.instructor_name || "—",
        students:    enrolled.length,
        capacity:    "—",
        remaining:   "—",
        waitlist:    0,
        revenue,
        completion:  avgAttendance,
        certificates: certs,
      };
    }).sort((a, b) => b.students - a.students);
  }, [data, derived]);

  /* unique filter options */
  const opts = useMemo(() => {
    if (!data || !derived) return { years: [], countries: [], instructors: [] };
    return {
      years: Array.from(new Set(derived.rows.map(r => r.enrolled_at && new Date(r.enrolled_at).getFullYear()).filter(Boolean))).sort((a, b) => Number(b) - Number(a)),
      countries: Array.from(new Set(derived.rows.map(r => r.country).filter(c => c && c !== "—"))).sort(),
      instructors: Array.from(new Set(data.courses.map(c => c.instructor_name).filter(Boolean))).sort(),
    };
  }, [data, derived]);

  /* guards */
  if (authLoading) return <AdminLayout><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mt-20" /></AdminLayout>;
  if (!isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  /* exports */
  const exportAll = (kind: "csv" | "xlsx") => {
    const studentRows = filtered.map(r => ({
      Name: r.full_name, Email: r.email, Phone: r.phone, Country: r.country,
      Registered: fmtDate(r.registered_at), Enrolled: fmtDate(r.enrolled_at),
      Course: r.course_title, Instructor: r.instructor, "Batch Date": fmtDate(r.batch_date),
      "Payment Status": r.payment_status, "Amount (EUR)": r.amount_paid, Coupon: r.coupon,
      "Attendance %": r.attendance_pct, Certificate: r.certificate,
      "Last Login": fmtDate(r.last_login), "Account": r.account_status,
    }));
    const courseRows = courseReports.map(c => ({
      Course: c.title, Instructor: c.instructor, Students: c.students,
      Capacity: c.capacity, Remaining: c.remaining, Waitlist: c.waitlist,
      "Revenue (EUR)": c.revenue, "Avg Attendance %": c.completion, Certificates: c.certificates,
    }));
    const monthlyRows = (charts?.monthly ?? []).map(m => ({
      Month: m.month, Enrollments: m.enrollments, "Revenue (EUR)": m.revenue,
      "New Students": m.students, Certificates: m.certs,
    }));
    if (kind === "csv") {
      exportCSV(studentRows, `ssra-students-${Date.now()}.csv`);
    } else {
      exportXLSX({ Students: studentRows, Courses: courseRows, Monthly: monthlyRows },
        `ssra-reports-${Date.now()}.xlsx`);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Crown className="w-6 h-6 text-[hsl(43,96%,50%)]" />
              Student Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Comprehensive academy analytics — Super Admin only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => exportAll("csv")} disabled={!filtered.length}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => exportAll("xlsx")} disabled={!filtered.length}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-[hsl(220,91%,54%)] text-white hover:opacity-90 disabled:opacity-50">
              <FileSpreadsheet className="w-4 h-4" /> Excel (xlsx)
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading reports…
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            Failed to load reports: {(error as Error).message}
          </div>
        )}

        {data && overview && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Students" value={overview.students.toLocaleString()} color="blue" />
              <StatCard icon={GraduationCap} label="Active Students" value={overview.activeStudents.toLocaleString()} color="green" />
              <StatCard icon={BookOpen} label="Enrollments" value={overview.enrollments.toLocaleString()} color="indigo" />
              <StatCard icon={DollarSign} label="Enrollment Revenue" value={fmtEUR(overview.revenue)} color="amber" />
              <StatCard icon={Award} label="Certificates" value={overview.certificates.toLocaleString()} color="emerald" />
              <StatCard icon={BookOpen} label="Active Courses" value={overview.courses.toLocaleString()} color="violet" />
              <StatCard icon={Layers} label="Batches" value={overview.batches.toLocaleString()} color="rose" />
              <StatCard icon={UserCog} label="Instructors" value={overview.instructors.toLocaleString()} color="slate" />
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                <FilterIcon className="w-4 h-4" /> Filters
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Select label="Year" value={year} onChange={setYear}
                  options={[{ v: "all", l: "All years" }, ...opts.years.map(y => ({ v: String(y), l: String(y) }))]} />
                <Select label="Month" value={month} onChange={setMonth}
                  options={[{ v: "all", l: "All months" }, ...MONTHS.map((m, i) => ({ v: String(i + 1), l: m }))]} />
                <Select label="Course" value={course} onChange={setCourse}
                  options={[{ v: "all", l: "All courses" }, ...data.courses.map(c => ({ v: c.id, l: c.title }))]} />
                <Select label="Instructor" value={instructor} onChange={setInstructor}
                  options={[{ v: "all", l: "All instructors" }, ...opts.instructors.map(i => ({ v: i!, l: i! }))]} />
                <Select label="Country" value={country} onChange={setCountry}
                  options={[{ v: "all", l: "All countries" }, ...opts.countries.map(c => ({ v: c!, l: c! }))]} />
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Search</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input type="text" placeholder="Name, email…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of {derived?.rows.length ?? 0} enrollment records
              </div>
            </div>

            {/* Charts */}
            {charts && charts.monthly.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Monthly Revenue (EUR)">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={charts.monthly}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(220,91%,54%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(220,91%,54%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(220,91%,54%)" fill="url(#rev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Student Growth (cumulative)">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={charts.growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="hsl(160,84%,39%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Enrollments by Course (top 10)">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.courseEnrollments} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                      <YAxis dataKey="course" type="category" fontSize={10} stroke="#64748b" width={140} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(43,96%,50%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Certificates & Attendance Trend">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={charts.monthly.map((m, i) => ({
                      ...m, attendance: charts.attendance[i]?.pct ?? 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="certs" name="Certificates" stroke="hsl(280,80%,55%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="attendance" name="Avg attendance %" stroke="hsl(15,85%,55%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* Course report */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Course Reports
                </h2>
                <span className="text-xs text-slate-400">{courseReports.length} courses</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <Th>Course</Th><Th>Instructor</Th><Th>Students</Th><Th>Capacity</Th>
                      <Th>Waitlist</Th><Th>Revenue</Th><Th>Avg Attendance</Th><Th>Certificates</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courseReports.map(c => (
                      <tr key={c.course_id} className="hover:bg-slate-50">
                        <Td className="font-medium text-slate-900">{c.title}</Td>
                        <Td>{c.instructor}</Td>
                        <Td>{c.students}</Td>
                        <Td>{c.capacity}</Td>
                        <Td>{c.waitlist}</Td>
                        <Td className="font-semibold text-emerald-700">{fmtEUR(c.revenue)}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[hsl(220,91%,54%)]" style={{ width: `${c.completion}%` }} />
                            </div>
                            <span className="text-xs text-slate-600">{c.completion}%</span>
                          </div>
                        </Td>
                        <Td>{c.certificates}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student details table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Student Details
                </h2>
                <span className="text-xs text-slate-400">{filtered.length} records</span>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0">
                    <tr>
                      <Th>Name</Th><Th>Email</Th><Th>Country</Th><Th>Registered</Th>
                      <Th>Enrolled</Th><Th>Course</Th><Th>Batch</Th><Th>Payment</Th>
                      <Th>Amount</Th><Th>Attendance</Th><Th>Certificate</Th><Th>Last Login</Th>
                      <Th>Account</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(r => (
                      <tr key={r.enrollment_id} className="hover:bg-slate-50">
                        <Td className="font-medium text-slate-900 whitespace-nowrap">{r.full_name}</Td>
                        <Td className="text-slate-600 whitespace-nowrap">{r.email}</Td>
                        <Td>{r.country}</Td>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.registered_at)}</Td>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.enrolled_at)}</Td>
                        <Td className="text-xs whitespace-nowrap">{r.course_title}</Td>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.batch_date)}</Td>
                        <Td>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            r.payment_status === "active" ? "bg-emerald-100 text-emerald-700"
                            : r.payment_status === "pending" ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                          }`}>{r.payment_status}</span>
                        </Td>
                        <Td className="font-semibold whitespace-nowrap">{fmtEUR(r.amount_paid)}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${r.attendance_pct >= 75 ? "bg-emerald-500" : r.attendance_pct >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${r.attendance_pct}%` }} />
                            </div>
                            <span className="text-xs">{r.attendance_pct}%</span>
                          </div>
                        </Td>
                        <Td className="text-xs whitespace-nowrap">{r.certificate}</Td>
                        <Td className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.last_login)}</Td>
                        <Td className="text-xs">{r.account_status}</Td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr><td colSpan={13} className="px-5 py-8 text-center text-slate-400">No records match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Phone, coupon usage, and waitlist data become available once those modules are connected.
            </p>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ───────────────────────── small UI ───────────────────────── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string;
  color: "blue" | "green" | "indigo" | "amber" | "emerald" | "violet" | "rose" | "slate";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 bg-white">
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5 text-left font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-slate-700 ${className}`}>{children}</td>;
}
