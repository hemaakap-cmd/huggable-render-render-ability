import { useState } from "react";
import { User, Mail, Globe, GraduationCap, Loader2, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { useMyProfile, useUpdateProfile } from "@/hooks/useSsraData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ssraSignOut } from "@/hooks/useSsraAuth";

const COUNTRIES = [
  "Egypt", "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Jordan", "Morocco",
  "Algeria", "Tunisia", "Iraq", "Lebanon", "Syria", "Sudan", "Libya",
  "Germany", "Austria", "Switzerland", "Other",
];

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function containsArabic(s: string) { return ARABIC_RE.test(s); }

export default function MyProfile() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ full_name: "", country: "", bio: "" });

  const [pwForm, setPwForm]   = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      toast({ title: "Please type DELETE to confirm", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("self-delete-account", {
        body: { confirm: "DELETE" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Account deleted", description: "Your account and data have been removed." });
      await ssraSignOut();
    } catch (err: any) {
      toast({ title: "Could not delete account", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  }

  function startEdit() {
    setForm({
      full_name: profile?.full_name ?? "",
      country:   profile?.country   ?? "",
      bio:       (profile as any)?.bio ?? "",
    });
    setEditing(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (form.full_name && containsArabic(form.full_name)) {
      toast({
        title: "English characters only",
        description: "Full name must be in English (Latin) characters only.",
        variant: "destructive",
      });
      return;
    }
    if (form.full_name && !/^[A-Za-z\s'\-\.]+$/.test(form.full_name.trim())) {
      toast({
        title: "Invalid name",
        description: "Full name may only contain English letters, spaces, hyphens, and apostrophes.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: form.full_name || null,
        country:   form.country   || null,
      });
      toast({ title: "Profile updated" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (pwForm.next.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" }); return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      toast({ title: "Password changed successfully" });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  const inputClass = "w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 focus:border-[hsl(220,91%,54%)] transition-colors";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account information.</p>
        </div>

        {/* Profile card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(220,91%,54%)] to-[hsl(220,91%,44%)] h-20" />
          <div className="px-6 pb-6">
            <div className="-mt-8 mb-4 flex items-end justify-between">
              <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-[hsl(220,91%,54%)] font-bold text-xl">
                {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
              </div>
              {!editing && !isLoading && (
                <button onClick={startEdit}
                  className="text-xs font-semibold text-[hsl(220,91%,54%)] border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  Edit
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-48" />
                <div className="h-4 bg-slate-100 rounded w-32" />
              </div>
            ) : !editing ? (
              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-slate-900 text-lg">{profile?.full_name ?? "—"}</div>
                  <div className="text-sm text-slate-400">{profile?.email}</div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  {profile?.country && (
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> {profile.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span className="capitalize">{profile?.role ?? "student"}</span>
                  </span>
                </div>
              </div>
            ) : (
              <form onSubmit={saveProfile} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Full Name</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Your full name" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Country</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className={inputClass}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(220,91%,54%)] text-white text-sm font-semibold hover:bg-[hsl(220,91%,46%)] disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Save
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Account info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Account Details</h2>
          <div className="flex items-center gap-3 py-2 border-b border-slate-50">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Email address</div>
              <div className="text-sm text-slate-700">{profile?.email ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-slate-50">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Account role</div>
              <div className="text-sm text-slate-700 capitalize">{profile?.role ?? "student"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <div className="text-xs text-slate-400">Member since</div>
              <div className="text-sm text-slate-700">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-DE", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm">Change Password</h2>
            <button onClick={() => setShowPw(!showPw)}
              className="text-xs text-[hsl(220,91%,54%)] font-semibold hover:underline">
              {showPw ? "Hide" : "Update password"}
            </button>
          </div>

          {showPw && (
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">New Password</label>
                <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  placeholder="Min. 8 characters" className={inputClass} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Confirm New Password</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat password" className={inputClass} required />
              </div>
              <button type="submit" disabled={pwSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-60 transition-colors mt-1">
                {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Update Password
              </button>
            </form>
          )}
        </div>

        {/* Danger zone — self delete */}
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900 text-sm">Delete Account</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Permanently delete your SSRA Academy account, profile, and access to all courses.
                Active enrollments will be cancelled. This action cannot be undone.
              </p>
            </div>
          </div>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete my account
            </button>
          ) : (
            <div className="space-y-3 mt-2">
              <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                To confirm, type <span className="font-mono font-bold">DELETE</span> below. Your data will be removed immediately.
              </div>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
                className={inputClass}
                autoComplete="off"
              />
              <div className="flex gap-3">
                <button
                  onClick={deleteAccount}
                  disabled={deleting || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Permanently delete
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
