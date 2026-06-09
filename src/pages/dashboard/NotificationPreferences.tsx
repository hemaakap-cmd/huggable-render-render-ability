import { useState, useEffect } from "react";
import { Bell, Mail, LayoutDashboard, Loader2, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Prefs = {
  email_session_reminders:        boolean;
  email_homework_graded:          boolean;
  email_certificates:             boolean;
  email_cancellations:            boolean;
  email_waitlist:                 boolean;
  email_subscription_changes:     boolean;
  email_materials_uploaded:       boolean;
  dashboard_session_reminders:    boolean;
  dashboard_homework_graded:      boolean;
  dashboard_certificates:         boolean;
  dashboard_cancellations:        boolean;
  dashboard_waitlist:             boolean;
  dashboard_subscription_changes: boolean;
  dashboard_materials_uploaded:   boolean;
};

const CATEGORIES: { key: keyof Prefs; email: keyof Prefs; label: string; description: string }[] = [
  {
    key:         "email_session_reminders",
    email:       "email_session_reminders",
    label:       "Session reminders",
    description: "Get notified 24 h and 1 h before your next live session",
  },
  {
    key:         "email_homework_graded",
    email:       "email_homework_graded",
    label:       "Homework graded",
    description: "Receive your grade and instructor feedback when homework is reviewed",
  },
  {
    key:         "email_certificates",
    email:       "email_certificates",
    label:       "Certificates",
    description: "Certificate issued or revoked",
  },
  {
    key:         "email_cancellations",
    email:       "email_cancellations",
    label:       "Cancellations & refunds",
    description: "Updates on your cancellation requests",
  },
  {
    key:         "email_waitlist",
    email:       "email_waitlist",
    label:       "Waitlist",
    description: "A seat opened up for a course you're waiting for",
  },
  {
    key:         "email_subscription_changes",
    email:       "email_subscription_changes",
    label:       "Subscription changes",
    description: "Payment issues, renewals, or subscription status changes",
  },
  {
    key:         "email_materials_uploaded",
    email:       "email_materials_uploaded",
    label:       "New course materials",
    description: "When new documents, videos, or homework are published",
  },
];

function usePrefs() {
  const { user } = useSsraAuth();
  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled:  !!user,
    queryFn:  async () => {
      const { data, error } = await (supabase.from("ssra_notification_preferences" as never) as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Prefs | null;
    },
  });
}

function useUpdatePrefs() {
  const { user } = useSsraAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      const { error } = await (supabase.from("ssra_notification_preferences" as never) as any)
        .upsert({ user_id: user!.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
  });
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
        checked ? "bg-[hsl(220,91%,54%)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationPreferences() {
  const { data: prefs, isLoading } = usePrefs();
  const update = useUpdatePrefs();
  const [local, setLocal] = useState<Prefs | null>(null);

  useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);

  const handleToggle = (field: keyof Prefs, value: boolean) => {
    if (!local) return;
    const next = { ...local, [field]: value };
    setLocal(next);
    update.mutate({ [field]: value });
  };

  const emailField = (key: keyof Prefs) =>
    key as keyof Prefs;
  const dashKey = (key: keyof Prefs) =>
    key.replace("email_", "dashboard_") as keyof Prefs;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[hsl(220,91%,54%)]" />
            Notification Preferences
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Choose which notifications you receive and how.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Category</span>
              <span className="flex items-center gap-1.5 w-16 justify-center">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <span className="flex items-center gap-1.5 w-16 justify-center">
                <LayoutDashboard className="w-3.5 h-3.5" /> In-app
              </span>
            </div>

            {CATEGORIES.map((cat, i) => {
              const emailKey  = emailField(cat.email);
              const dashboardKey = dashKey(cat.email);
              return (
                <div
                  key={cat.key}
                  className={`grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-4 items-center ${
                    i !== CATEGORIES.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {cat.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {cat.description}
                    </div>
                  </div>
                  <div className="w-16 flex justify-center">
                    <Toggle
                      checked={local?.[emailKey] ?? true}
                      onChange={(v) => handleToggle(emailKey, v)}
                      disabled={update.isPending}
                    />
                  </div>
                  <div className="w-16 flex justify-center">
                    <Toggle
                      checked={local?.[dashboardKey] ?? true}
                      onChange={(v) => handleToggle(dashboardKey, v)}
                      disabled={update.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Saved indicator */}
        {update.isSuccess && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
