import { useState } from "react";
import { Crown, UserCog, Search, Shield, ShieldCheck, User, GraduationCap, AlertTriangle, Check } from "lucide-react";
import AdminLayout from "@/components/ssra/AdminLayout";
import { useAdminUsers, useSearchStudents, useSetUserRole } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

type Role = "student" | "instructor" | "admin" | "super_admin";

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  student:     { label: "Student",     color: "bg-slate-100 text-slate-600 border-slate-200",        icon: User },
  instructor:  { label: "Instructor",  color: "bg-emerald-50 text-emerald-700 border-emerald-200",   icon: GraduationCap },
  admin:       { label: "Admin",       color: "bg-blue-50 text-[hsl(220,91%,54%)] border-blue-200",  icon: Shield },
  super_admin: { label: "Super Admin", color: "bg-amber-50 text-amber-700 border-amber-200",         icon: Crown },
};

function RoleBadge({ role }: { role: Role }) {
  const { label, color, icon: Icon } = ROLE_CONFIG[role] ?? ROLE_CONFIG.student;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

function ConfirmDialog({ name, from, to, onConfirm, onCancel }: {
  name: string; from: Role; to: Role;
  onConfirm: () => void; onCancel: () => void;
}) {
  const isPromotion = to === "admin" || to === "super_admin";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
          isPromotion ? "bg-blue-100 text-[hsl(220,91%,54%)]" : "bg-red-100 text-red-600"
        }`}>
          {isPromotion ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        <h3 className="font-display text-lg font-bold text-slate-900 text-center mb-2">
          {isPromotion ? "Promote User" : "Remove Admin Access"}
        </h3>
        <p className="text-sm text-slate-500 text-center mb-1">
          Change <strong className="text-slate-800">{name}</strong>'s role from
        </p>
        <div className="flex items-center justify-center gap-2 mb-5">
          <RoleBadge role={from} />
          <span className="text-slate-400 text-xs">→</span>
          <RoleBadge role={to} />
        </div>
        {!isPromotion && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            This will remove admin access immediately. The user won't be able to access the admin panel.
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              isPromotion
                ? "bg-[hsl(220,91%,54%)] text-white hover:bg-[hsl(220,91%,46%)]"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}>
            <Check className="w-4 h-4" /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminAdmins() {
  const { profile, isSuperAdmin, loading } = useSsraAuth();
  const [search, setSearch]   = useState("");
  const [confirm, setConfirm] = useState<{ userId: string; name: string; from: Role; to: Role } | null>(null);
  const { toast } = useToast();

  const { data: admins = [], isLoading: adminsLoading } = useAdminUsers();
  const { data: searchResults = [] }                    = useSearchStudents(search);
  const setRole = useSetUserRole();

  if (!loading && !isSuperAdmin) return <Navigate to="/ssra-admin" replace />;

  async function handleRoleChange() {
    if (!confirm) return;
    await setRole.mutateAsync({ userId: confirm.userId, role: confirm.to });
    toast({
      title: "Role updated",
      description: `${confirm.name} is now ${ROLE_CONFIG[confirm.to].label}.`,
    });
    setConfirm(null);
    setSearch("");
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(43,96%,50%)]/15 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-[hsl(43,96%,50%)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-500 text-sm">Promote or demote admins, instructors and super admins — Super Admin only.</p>
          </div>
        </div>

        {/* Current team */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[hsl(220,91%,54%)]" /> Current Admins, Instructors & Super Admins
            </h2>
            <span className="text-xs text-slate-400">{(admins as any[]).length} total</span>
          </div>

          {adminsLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
          ) : (admins as any[]).length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">No admins yet.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {(admins as any[]).map((u: any) => {
                const isSelf       = u.id === profile?.id;
                const isSuper      = u.role === "super_admin";
                const isInstructor = u.role === "instructor";
                const canDemote    = !isSelf && !(isSuper && !isSuperAdmin);

                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSuper      ? "bg-amber-100 text-amber-700" :
                      isInstructor ? "bg-emerald-100 text-emerald-700" :
                                     "bg-blue-100 text-[hsl(220,91%,54%)]"
                    }`}>
                      {u.full_name?.[0] ?? u.email?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {u.full_name ?? "—"}
                        </span>
                        {isSelf && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">You</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{u.email}</div>
                    </div>
                    <RoleBadge role={u.role as Role} />
                    {canDemote && (
                      <button
                        onClick={() => setConfirm({ userId: u.id, name: u.full_name ?? u.email, from: u.role, to: "student" })}
                        className="text-xs font-semibold text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                        Demote
                      </button>
                    )}
                    {isSelf && (
                      <span className="text-xs text-slate-300 shrink-0">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Promote a user */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Crown className="w-4 h-4 text-[hsl(43,96%,50%)]" /> Promote a User
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Search any registered user to grant Instructor, Admin or Super Admin access.</p>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email (min 2 chars)…"
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] bg-white" />
            </div>

            {search.length >= 2 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {(searchResults as any[]).length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">No users found.</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {(searchResults as any[]).map((u: any) => (
                      <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                          {u.full_name?.[0] ?? u.email?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{u.full_name ?? "—"}</div>
                          <div className="text-xs text-slate-400 truncate">{u.email}</div>
                        </div>
                        <RoleBadge role={u.role as Role} />
                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                          {u.role !== "instructor" && u.role !== "admin" && u.role !== "super_admin" && (
                            <button
                              onClick={() => setConfirm({ userId: u.id, name: u.full_name ?? u.email, from: u.role, to: "instructor" })}
                              className="text-xs font-semibold text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                              → Instructor
                            </button>
                          )}
                          {u.role !== "admin" && u.role !== "super_admin" && (
                            <button
                              onClick={() => setConfirm({ userId: u.id, name: u.full_name ?? u.email, from: u.role, to: "admin" })}
                              className="text-xs font-semibold text-[hsl(220,91%,54%)] border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                              → Admin
                            </button>
                          )}
                          {u.role !== "super_admin" && (
                            <button
                              onClick={() => setConfirm({ userId: u.id, name: u.full_name ?? u.email, from: u.role, to: "super_admin" })}
                              className="text-xs font-semibold text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors">
                              → Super Admin
                            </button>
                          )}
                          {u.role === "super_admin" && (
                            <span className="text-xs text-slate-400">Already highest role</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-700 leading-relaxed">
            <strong>Role permissions:</strong> Students can access the student dashboard only.
            Admins can manage students, verifications, sessions, and courses.
            Super Admins have full access including financial data and admin management.
            Changes take effect immediately on next login.
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          name={confirm.name}
          from={confirm.from}
          to={confirm.to}
          onConfirm={handleRoleChange}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AdminLayout>
  );
}
