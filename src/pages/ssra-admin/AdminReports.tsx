import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileSpreadsheet, Download, Loader2, RefreshCw, Filter,
  Users, TrendingUp, Calendar, Bell,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ── CSV utility ── */
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: mime }); // BOM for Excel UTF-8
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Report types ── */
type ReportRow = {
  student_name:      string | null;
  student_email:     string | null;
  phone_number:      string | null;
  country:           string | null;
  payment_status:    string | null;
  enrollment_date:   string | null;
  course_name:       string | null;
  batch_date:        string | null;
  coupon_code:       string | null;
  amount_paid:       number | null;
  attendance_pct:    number | null;
  certificate_status: string | null;
  report_month:      string | null;
  course_id:         string | null;
};

type GroupBy = "month" | "course" | "none";

function useEnrollmentReport() {
  return useQuery({
    queryKey: ["ssra-enrollment-report"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_enrollment_report" as never) as any)
        .select("*")
        .order("enrollment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });
}

function useAdminCoursesList() {
  return useQuery({
    queryKey: ["ssra-admin-courses-for-report"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_courses").select("id, title").order("sort_order");
      return data ?? [];
    },
  });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function StatusBadge({ status }: { status: string | null }) {
  const c: Record<string, string> = {
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    refunded: "bg-slate-100 text-slate-500 border-slate-200",
    canceled: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c[status ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
      {status ?? "—"}
    </span>
  );
}

export default function AdminReports() {
  const { toast } = useToast();
  const { data: allRows = [], isLoading, refetch, isFetching } = useEnrollmentReport();
  const { data: courses = [] } = useAdminCoursesList();

  const [groupBy,      setGroupBy]      = useState<GroupBy>("none");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterMonth,  setFilterMonth]  = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  /* derive available months */
  const months = [...new Set(allRows.map((r) => r.report_month?.slice(0, 7)).filter(Boolean))].sort().reverse();

  /* filtered rows */
  const rows = allRows.filter((r) => {
    if (filterCourse && r.course_id !== filterCourse) return false;
    if (filterMonth  && !r.report_month?.startsWith(filterMonth)) return false;
    if (filterStatus && r.payment_status !== filterStatus) return false;
    return true;
  });

  /* export */
  const handleExport = (type: "csv" | "excel") => {
    if (rows.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const exportRows = rows.map((r) => ({
      "Student Name":      r.student_name ?? "",
      "Email":             r.student_email ?? "",
      "Phone":             r.phone_number ?? "",
      "Country":           r.country ?? "",
      "Payment Status":    r.payment_status ?? "",
      "Enrollment Date":   formatDate(r.enrollment_date),
      "Course":            r.course_name ?? "",
      "Batch Start":       formatDate(r.batch_date),
      "Coupon Used":       r.coupon_code ?? "",
      "Amount Paid (€)":   r.amount_paid ?? 0,
      "Attendance %":      r.attendance_pct ?? 0,
      "Certificate":       r.certificate_status ?? "",
      "Month":             r.report_month?.slice(0, 7) ?? "",
    }));

    const csv  = toCSV(exportRows);
    const slug = filterCourse
      ? (courses as any[]).find((c: any) => c.id === filterCourse)?.title?.replace(/\s+/g, "-") ?? "course"
      : "all-courses";
    const date = new Date().toISOString().slice(0, 10);
    const fname = `ssra-report-${slug}-${date}.${type === "excel" ? "csv" : "csv"}`;
    downloadFile(csv, fname, type === "excel" ? "application/vnd.ms-excel" : "text/csv");
    toast({ title: `Exported ${rows.length} rows` });
  };

  /* group rows */
  const grouped: { label: string; rows: ReportRow[] }[] = (() => {
    if (groupBy === "month") {
      const map = new Map<string, ReportRow[]>();
      rows.forEach((r) => {
        const k = r.report_month?.slice(0, 7) ?? "Unknown";
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(r);
      });
      return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({ label: k, rows: v }));
    }
    if (groupBy === "course") {
      const map = new Map<string, ReportRow[]>();
      rows.forEach((r) => {
        const k = r.course_name ?? "Unknown";
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(r);
      });
      return [...map.entries()].sort().map(([k, v]) => ({ label: k, rows: v }));
    }
    return [{ label: "All", rows }];
  })();

  /* summary stats */
  const totalRevenue = rows.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
  const certCount    = rows.filter((r) => r.certificate_status === "Issued").length;
  const avgAtt       = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / rows.length)
    : 0;

  /* send reminders */
  const handleSendReminders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.functions.invoke("send-session-reminders", {});
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reminders sent", description: `${data.notifications24h + data.notifications1h} notifications created.` });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Reports & Export</h1>
            <p className="text-slate-500 text-sm mt-1">{rows.length} enrollment records matching current filters.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSendReminders}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Bell className="w-4 h-4" /> Send Reminders
            </button>
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { icon: Users,        label: "Enrollments", value: rows.length.toString() },
            { icon: TrendingUp,   label: "Revenue",     value: `€${totalRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })}` },
            { icon: Calendar,     label: "Avg Attendance", value: `${avgAtt}%` },
            { icon: FileSpreadsheet, label: "Certificates", value: certCount.toString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <div className="font-display text-xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All months</option>
              {months.map((m) => <option key={m} value={m!}>{m}</option>)}
            </select>

            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All courses</option>
              {(courses as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="refunded">Refunded</option>
              <option value="canceled">Canceled</option>
            </select>

            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="none">No grouping</option>
              <option value="month">Group by month</option>
              <option value="course">Group by course</option>
            </select>

            {(filterMonth || filterCourse || filterStatus) && (
              <button
                onClick={() => { setFilterMonth(""); setFilterCourse(""); setFilterStatus(""); }}
                className="text-xs text-slate-400 hover:text-slate-700 px-3 py-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No data</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ label, rows: groupRows }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {groupBy !== "none" && (
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">{label}</span>
                    <span className="text-xs text-slate-400">{groupRows.length} rows · €{groupRows.reduce((s, r) => s + (r.amount_paid ?? 0), 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <th className="text-left px-4 py-3 min-w-[130px]">Student</th>
                        <th className="text-left px-4 py-3 min-w-[160px]">Email</th>
                        <th className="text-left px-4 py-3">Phone</th>
                        <th className="text-left px-4 py-3">Country</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3 min-w-[100px]">Enrolled</th>
                        <th className="text-left px-4 py-3 min-w-[130px]">Course</th>
                        <th className="text-left px-4 py-3">Batch</th>
                        <th className="text-left px-4 py-3">Coupon</th>
                        <th className="text-right px-4 py-3">Amount</th>
                        <th className="text-right px-4 py-3">Attendance</th>
                        <th className="text-left px-4 py-3">Certificate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[130px]">{r.student_name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-[160px]">{r.student_email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{r.phone_number ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{r.country ?? "—"}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.payment_status} /></td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.enrollment_date)}</td>
                          <td className="px-4 py-3 text-slate-700 font-medium truncate max-w-[130px]">{r.course_name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.batch_date)}</td>
                          <td className="px-4 py-3">
                            {r.coupon_code
                              ? <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{r.coupon_code}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {r.amount_paid != null ? `€${r.amount_paid.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.attendance_pct != null
                              ? <span className={`font-semibold ${r.attendance_pct >= 75 ? "text-emerald-600" : r.attendance_pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                  {r.attendance_pct}%
                                </span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.certificate_status === "Issued" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {r.certificate_status ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
