import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag, Plus, Pencil, ToggleLeft, ToggleRight, Loader2,
  Percent, EuroIcon, Calendar, Hash, BookOpen,
} from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  discount_type: "percent" | "fixed_eur";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  course_id: string | null;
  minimum_amount_eur: number | null;
  paddle_discount_id: string | null;
  is_active: boolean;
  created_at: string;
};

const EMPTY: Partial<Coupon> = {
  code: "", name: "", discount_type: "percent", discount_value: 10,
  max_uses: null, valid_from: null, valid_until: null,
  course_id: null, minimum_amount_eur: null, paddle_discount_id: null,
  is_active: true,
};

function useCoupons() {
  return useQuery({
    queryKey: ["ssra-admin-coupons"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ssra_coupons" as never) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });
}

function useUpsertCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<Coupon>) => {
      const payload = {
        code: (c.code ?? "").toUpperCase().trim(),
        name: c.name || null,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_uses: c.max_uses ? Number(c.max_uses) : null,
        valid_from: c.valid_from || null,
        valid_until: c.valid_until || null,
        course_id: c.course_id || null,
        minimum_amount_eur: c.minimum_amount_eur ? Number(c.minimum_amount_eur) : null,
        paddle_discount_id: c.paddle_discount_id?.trim() ? c.paddle_discount_id.trim() : null,
        is_active: c.is_active ?? true,
        updated_at: new Date().toISOString(),
      };
      if (c.id) {
        const { error } = await (supabase.from("ssra_coupons" as never) as any)
          .update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("ssra_coupons" as never) as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-coupons"] }),
  });
}

function useToggleCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("ssra_coupons" as never) as any)
        .update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssra-admin-coupons"] }),
  });
}

export default function AdminCoupons() {
  const { toast } = useToast();
  const { data: coupons = [], isLoading } = useCoupons();
  const upsert = useUpsertCoupon();
  const toggle = useToggleCoupon();
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [saving, setSaving]   = useState(false);

  const { data: courses = [] } = useQuery({
    queryKey: ["ssra-courses-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("ssra_courses").select("id, title").order("sort_order");
      return data ?? [];
    },
  });

  const save = async () => {
    if (!editing) return;
    if (!editing.code?.trim()) { toast({ title: "Code is required", variant: "destructive" }); return; }
    if (!editing.discount_value || Number(editing.discount_value) <= 0) {
      toast({ title: "Discount value must be > 0", variant: "destructive" }); return;
    }
    if (!editing.paddle_discount_id?.trim() || !/^dsc_/i.test(editing.paddle_discount_id.trim())) {
      toast({ title: "Paddle Discount ID is required", description: "Must start with 'dsc_'. Create the discount in Paddle first.", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast({ title: editing.id ? "Coupon updated" : "Coupon created" });
      setEditing(null);
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle_ = async (c: Coupon) => {
    await toggle.mutateAsync({ id: c.id, is_active: !c.is_active });
    toast({ title: c.is_active ? "Coupon deactivated" : "Coupon activated" });
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Coupon Codes</h1>
            <p className="text-slate-500 text-sm mt-1">{coupons.length} code{coupons.length !== 1 ? "s" : ""} total</p>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>

        {/* Create / Edit modal */}
        {editing && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">{editing.id ? "Edit Coupon" : "New Coupon"}</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Code *</label>
                <input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name (internal)</label>
                <input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Summer promotion"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Discount type *</label>
                <select
                  value={editing.discount_type ?? "percent"}
                  onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as "percent" | "fixed_eur" })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed_eur">Fixed amount (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Discount value * {editing.discount_type === "percent" ? "(%)" : "(€)"}
                </label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={editing.discount_value ?? ""}
                  onChange={(e) => setEditing({ ...editing, discount_value: parseFloat(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Max uses (blank = unlimited)</label>
                <input
                  type="number" min="1"
                  value={editing.max_uses ?? ""}
                  onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Minimum order (€, optional)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={editing.minimum_amount_eur ?? ""}
                  onChange={(e) => setEditing({ ...editing, minimum_amount_eur: e.target.value ? parseFloat(e.target.value) : null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valid from (optional)</label>
                <input
                  type="datetime-local"
                  value={editing.valid_from ? editing.valid_from.slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, valid_from: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Valid until (optional)</label>
                <input
                  type="datetime-local"
                  value={editing.valid_until ? editing.valid_until.slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Restrict to course (optional)</label>
                <select
                  value={editing.course_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, course_id: e.target.value || null })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All courses</option>
                  {(courses as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Paddle Discount ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={editing.paddle_discount_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, paddle_discount_id: e.target.value })}
                  placeholder="dsc_01h..."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-amber-600 mt-1">
                  Required. Create a matching discount in the Paddle dashboard and paste its ID here. Without it the discount will NOT be applied at checkout (customer would be charged the full price).
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Coupon"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-5 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Coupon table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900">No coupons yet</h3>
            <p className="text-sm text-slate-500 mt-1">Create your first coupon code above.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Discount</th>
                    <th className="px-4 py-3 text-left">Uses</th>
                    <th className="px-4 py-3 text-left">Valid until</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map((c) => {
                    const isExpired = c.valid_until && new Date(c.valid_until) < new Date();
                    const isFull    = c.max_uses !== null && c.uses_count >= c.max_uses;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-slate-900">{c.code}</div>
                          {c.name && <div className="text-xs text-slate-400">{c.name}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            {c.discount_type === "percent"
                              ? <><Percent className="w-3.5 h-3.5 text-blue-500" /> {c.discount_value}% off</>
                              : <><EuroIcon className="w-3.5 h-3.5 text-emerald-500" /> €{c.discount_value} off</>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Hash className="w-3.5 h-3.5" />
                            {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                          </div>
                          {isFull && <div className="text-xs text-red-500 mt-0.5">Limit reached</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.valid_until
                            ? <span className={isExpired ? "text-red-500" : ""}>
                                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                {new Date(c.valid_until).toLocaleDateString()}
                                {isExpired && " (expired)"}
                              </span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.course_id
                            ? <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Restricted</span>
                            : "All courses"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            c.is_active && !isExpired && !isFull
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {!c.is_active ? "Inactive" : isExpired ? "Expired" : isFull ? "Used up" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditing(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggle_(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                              title={c.is_active ? "Deactivate" : "Activate"}
                            >
                              {c.is_active
                                ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                                : <ToggleLeft  className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
