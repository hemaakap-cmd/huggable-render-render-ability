import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Upload, Eye, EyeOff, Save, Search, GraduationCap, ShieldCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/ssra/AdminLayout";
import { toast } from "@/hooks/use-toast";

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "instructor" | "admin" | "super_admin" | "student";
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  country: string | null;
  is_public_team: boolean;
  team_display_order: number;
  social_links: Record<string, string>;
};

type TabKey = "instructor" | "admin";

const TABS: { key: TabKey; label: string; icon: typeof GraduationCap; roles: string[] }[] = [
  { key: "instructor", label: "Instructors", icon: GraduationCap, roles: ["instructor"] },
  { key: "admin",      label: "Administrators", icon: ShieldCheck, roles: ["admin", "super_admin"] },
];

async function uploadPhoto(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `team/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from("site-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (sErr || !data?.signedUrl) throw sErr ?? new Error("Could not sign URL");
  return data.signedUrl;
}

export default function SuperAdminTeam() {
  const [tab, setTab] = useState<TabKey>("instructor");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [rows, setRows] = useState<TeamMember[]>([]);

  async function load() {
    setLoading(true);
    const roles = TABS.find((t) => t.key === tab)!.roles;
    const { data, error } = await supabase
      .from("ssra_profiles")
      .select("id, full_name, email, role, title, bio, photo_url, country, is_public_team, team_display_order, social_links")
      .in("role", roles)
      .order("team_display_order", { ascending: true })
      .order("full_name", { ascending: true });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data ?? []).map((r) => ({
        ...r,
        social_links: (r.social_links ?? {}) as Record<string, string>,
      })) as TeamMember[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  function update(id: string, patch: Partial<TeamMember>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(m: TeamMember) {
    setSavingId(m.id);
    const { error } = await supabase
      .from("ssra_profiles")
      .update({
        title: m.title,
        bio: m.bio,
        photo_url: m.photo_url,
        is_public_team: m.is_public_team,
        team_display_order: m.team_display_order,
        social_links: m.social_links as never,
      })
      .eq("id", m.id);
    setSavingId(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: `${m.full_name ?? m.email} updated.` });
  }

  async function onUpload(m: TeamMember, file: File) {
    setUploadingId(m.id);
    try {
      const url = await uploadPhoto(file, m.id);
      update(m.id, { photo_url: url });
      toast({ title: "Photo uploaded", description: "Click Save to apply." });
    } catch (e: unknown) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  }

  async function quickToggle(m: TeamMember) {
    const next = !m.is_public_team;
    update(m.id, { is_public_team: next });
    const { error } = await supabase
      .from("ssra_profiles")
      .update({ is_public_team: next })
      .eq("id", m.id);
    if (error) {
      update(m.id, { is_public_team: !next });
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.full_name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.title ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <Helmet><title>Our Team — Super Admin</title></Helmet>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Our Team</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage how instructors and administrators appear on the public team page.
            </p>
          </div>
          <a
            href="/team"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View public team page
          </a>
        </header>

        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
          <div className="relative ml-auto flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, title…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-12 text-center text-sm text-slate-500">
            No {tab === "instructor" ? "instructors" : "administrators"} found.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((m) => (
              <article key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 text-xl font-bold">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.full_name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      (m.full_name ?? m.email ?? "?")[0]?.toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {m.full_name ?? "—"}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{m.email}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                          {m.role}
                        </p>
                      </div>
                      <button
                        onClick={() => quickToggle(m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          m.is_public_team
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {m.is_public_team ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {m.is_public_team ? "Public" : "Hidden"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Title</label>
                        <input
                          value={m.title ?? ""}
                          placeholder="e.g. Senior Radiology Instructor"
                          onChange={(e) => update(m.id, { title: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Display order</label>
                        <input
                          type="number"
                          value={m.team_display_order}
                          onChange={(e) => update(m.id, { team_display_order: parseInt(e.target.value || "0", 10) })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bio</label>
                      <textarea
                        value={m.bio ?? ""}
                        rows={2}
                        placeholder="Short bio shown on the public team page…"
                        onChange={(e) => update(m.id, { bio: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">LinkedIn URL</label>
                        <input
                          value={m.social_links?.linkedin ?? ""}
                          placeholder="https://linkedin.com/in/…"
                          onChange={(e) => update(m.id, { social_links: { ...m.social_links, linkedin: e.target.value } })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Website URL</label>
                        <input
                          value={m.social_links?.website ?? ""}
                          placeholder="https://…"
                          onChange={(e) => update(m.id, { social_links: { ...m.social_links, website: e.target.value } })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-200">
                        {uploadingId === m.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {uploadingId === m.id ? "Uploading…" : m.photo_url ? "Replace photo" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUpload(m, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        onClick={() => save(m)}
                        disabled={savingId === m.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(43,96%,50%)] text-slate-900 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        {savingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
