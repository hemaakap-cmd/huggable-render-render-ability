import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Loader2, Plus, Search, ShieldOff, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/ssra/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminCertificates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: certs, isLoading } = useQuery({
    queryKey: ["ssra-admin-certificates", search],
    queryFn: async () => {
      let q = supabase
        .from("ssra_certificates")
        .select("*")
        .order("issued_at", { ascending: false });
      if (search) q = q.or(`certificate_code.ilike.%${search}%,student_name.ilike.%${search}%,course_title.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: students } = useQuery({
    queryKey: ["ssra-admin-students-light"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_profiles").select("id,full_name,email").eq("role", "student").order("full_name");
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["ssra-admin-courses-light"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_courses").select("id,title").order("sort_order");
      return data ?? [];
    },
  });

  const toggleRevoke = useMutation({
    mutationFn: async ({ id, revoked }: { id: string; revoked: boolean }) => {
      const { error } = await supabase.from("ssra_certificates").update({ revoked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ssra-admin-certificates"] });
      toast({ title: "Updated" });
    },
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900 mb-1">Certificates</h1>
            <p className="text-sm text-slate-500">Issue and manage course completion certificates.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-luxury-primary"><Plus className="w-4 h-4 mr-1.5" /> Issue Certificate</Button>
            </DialogTrigger>
            <IssueDialog students={students ?? []} courses={courses ?? []} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["ssra-admin-certificates"] }); }} />
          </Dialog>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, student, course…" className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : !certs?.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">No certificates issued yet</h3>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Course</th>
                  <th className="text-left px-4 py-3">Issued</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certs.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{c.certificate_code}</td>
                    <td className="px-4 py-3">{c.student_name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.course_title}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(c.issued_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {c.revoked
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">Revoked</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">Valid</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link to={`/verify/${c.certificate_code}`} target="_blank" className="text-slate-400 hover:text-[hsl(220,91%,54%)]" title="Open verification">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => toggleRevoke.mutate({ id: c.id, revoked: !c.revoked })}
                          className="text-slate-400 hover:text-red-600"
                          title={c.revoked ? "Restore" : "Revoke"}
                        >
                          {c.revoked ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function IssueDialog({
  students, courses, onDone,
}: {
  students: Array<{ id: string; full_name: string | null; email: string | null }>;
  courses: Array<{ id: string; title: string }>;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ user_id: "", course_id: "", student_name: "", course_title: "", grade: "" });
  const [submitting, setSubmitting] = useState(false);

  const onUserPick = (id: string) => {
    const s = students.find((x) => x.id === id);
    setForm((f) => ({ ...f, user_id: id, student_name: s?.full_name ?? s?.email ?? f.student_name }));
  };
  const onCoursePick = (id: string) => {
    const c = courses.find((x) => x.id === id);
    setForm((f) => ({ ...f, course_id: id, course_title: c?.title ?? f.course_title }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_name || !form.course_title) {
      toast({ title: "Student name and course title are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("ssra_certificates").insert({
      user_id: form.user_id || null,
      course_id: form.course_id || null,
      student_name: form.student_name,
      course_title: form.course_title,
      grade: form.grade || null,
      issued_by: user?.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Certificate issued" });
    onDone();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Student (optional)</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.user_id} onChange={(e) => onUserPick(e.target.value)}>
            <option value="">— manual entry —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Student name *</Label>
          <Input value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Course (optional)</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.course_id} onChange={(e) => onCoursePick(e.target.value)}>
            <option value="">— manual entry —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Course title *</Label>
          <Input value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Grade (optional)</Label>
          <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Excellent, 1.3, Pass" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting} className="btn-luxury-primary">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Issuing…</> : "Issue"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
