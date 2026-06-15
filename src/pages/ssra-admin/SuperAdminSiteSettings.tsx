import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Upload, Trash2, Plus, Save, ImageIcon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/ssra/AdminLayout";
import { toast } from "@/hooks/use-toast";

type SiteSetting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

type SettingField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "image" | "url";
  placeholder?: string;
};

type SettingGroup = {
  key: string;
  title: string;
  description: string;
  fields: SettingField[];
};

const GROUPS: SettingGroup[] = [
  {
    key: "hero",
    title: "Homepage Hero",
    description: "Top banner shown on the landing page.",
    fields: [
      { name: "title", label: "Headline", type: "text", placeholder: "Become a German-licensed radiologic assistant" },
      { name: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Short paragraph under the headline" },
      { name: "cta_label", label: "CTA Button Label", type: "text", placeholder: "Explore Courses" },
      { name: "cta_link", label: "CTA Button Link", type: "url", placeholder: "/courses" },
      { name: "background_image", label: "Background Image", type: "image" },
    ],
  },
  {
    key: "about",
    title: "About Section",
    description: "Short pitch about the academy on the homepage.",
    fields: [
      { name: "title", label: "Section Title", type: "text" },
      { name: "body", label: "Body Text", type: "textarea" },
      { name: "image", label: "Illustration", type: "image" },
    ],
  },
  {
    key: "promo_banner",
    title: "Promo Banner",
    description: "Optional banner shown above the navbar (leave empty to hide).",
    fields: [
      { name: "text", label: "Banner Text", type: "text", placeholder: "🎓 New cohort starting soon — apply now" },
      { name: "link", label: "Link", type: "url", placeholder: "/courses" },
    ],
  },
  {
    key: "contact",
    title: "Contact Info",
    description: "Public contact details shown in the footer and contact page.",
    fields: [
      { name: "email", label: "Email", type: "text" },
      { name: "phone", label: "Phone / WhatsApp", type: "text" },
      { name: "address", label: "Address", type: "text" },
    ],
  },
];

async function uploadImage(file: File, key: string, field: string): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${key}/${field}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  // Private bucket: produce a 10-year signed URL
  const { data, error: signErr } = await supabase.storage
    .from("site-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not sign URL");
  return data.signedUrl;
}

export default function SuperAdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, Record<string, unknown>>>({});

  async function load() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("ssra_site_settings")
      .select("key, value, updated_at");
    if (error) {
      toast({ title: "Failed to load settings", description: error.message, variant: "destructive" });
    } else {
      const next: Record<string, Record<string, unknown>> = {};
      (rows as SiteSetting[] | null)?.forEach((r) => { next[r.key] = (r.value as Record<string, unknown>) ?? {}; });
      setData(next);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function setField(group: string, field: string, value: unknown) {
    setData((d) => ({ ...d, [group]: { ...(d[group] ?? {}), [field]: value } }));
  }

  async function save(group: SettingGroup) {
    setSaving(group.key);
    const payload = data[group.key] ?? {};
    const { error } = await supabase
      .from("ssra_site_settings")
      .upsert({ key: group.key, value: payload as never }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${group.title} updated.` });
    }
  }

  async function onUpload(group: SettingGroup, field: SettingField, file: File) {
    const tag = `${group.key}.${field.name}`;
    setUploading(tag);
    try {
      const url = await uploadImage(file, group.key, field.name);
      setField(group.key, field.name, url);
      toast({ title: "Image uploaded", description: "Click Save to apply." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  }

  return (
    <AdminLayout>
      <Helmet><title>Site Settings — Super Admin</title></Helmet>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Edit homepage content, banners, contact info, and images shown across the public site.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View site
          </a>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          GROUPS.map((group) => {
            const values = data[group.key] ?? {};
            return (
              <section key={group.key} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{group.title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                </div>

                <div className="space-y-4">
                  {group.fields.map((field) => {
                    const v = (values[field.name] as string) ?? "";
                    const tag = `${group.key}.${field.name}`;
                    return (
                      <div key={field.name} className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">{field.label}</label>

                        {field.type === "textarea" && (
                          <textarea
                            value={v}
                            placeholder={field.placeholder}
                            onChange={(e) => setField(group.key, field.name, e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          />
                        )}

                        {(field.type === "text" || field.type === "url") && (
                          <input
                            type={field.type === "url" ? "url" : "text"}
                            value={v}
                            placeholder={field.placeholder}
                            onChange={(e) => setField(group.key, field.name, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          />
                        )}

                        {field.type === "image" && (
                          <div className="flex items-start gap-3">
                            <div className="w-28 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                              {v ? (
                                <img src={v} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium cursor-pointer hover:bg-slate-800">
                                {uploading === tag ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                {uploading === tag ? "Uploading…" : v ? "Replace image" : "Upload image"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) onUpload(group, field, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {v && (
                                <button
                                  onClick={() => setField(group.key, field.name, "")}
                                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 ml-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              )}
                              <p className="text-[10px] text-slate-400 truncate">{v}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => save(group)}
                    disabled={saving === group.key}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(43,96%,50%)] text-slate-900 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving === group.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save {group.title}
                  </button>
                </div>
              </section>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
