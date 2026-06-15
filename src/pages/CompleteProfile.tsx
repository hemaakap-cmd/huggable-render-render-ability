import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSsraAuth, ssraSignOut } from "@/hooks/useSsraAuth";
import {
  isProfileComplete,
  validateFullName,
  validatePhone,
  validateCity,
  validateAddress,
  validateCountry,
  validateDegree,
  validateGermanLevel,
} from "@/lib/profileCompletion";
import SsraLogo from "@/components/ssra/SsraLogo";
import BackButton from "@/components/ssra/BackButton";

const COUNTRIES = [
  "Egypt", "Saudi Arabia", "UAE", "Kuwait", "Qatar", "Jordan", "Morocco",
  "Algeria", "Tunisia", "Iraq", "Lebanon", "Syria", "Sudan", "Libya",
  "Germany", "Austria", "Switzerland", "Other",
];
const DEGREES = [
  "Bachelor of Physical Therapy",
  "Bachelor of Sport Science",
  "Bachelor of Medicine",
  "Bachelor of Pharmacy",
  "Bachelor of Nursing",
  "Other",
];
const GERMAN_LEVELS = ["None / A0", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useSsraAuth();
  const { toast } = useToast();

  const [fullName, setFullName]       = useState("");
  const [phone, setPhone]             = useState("");
  const [country, setCountry]         = useState("");
  const [city, setCity]               = useState("");
  const [address, setAddress]         = useState("");
  const [dob, setDob]                 = useState("");
  const [degree, setDegree]           = useState("");
  const [germanLevel, setGermanLevel] = useState("");
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone_number ?? "");
      setCountry(profile.country ?? "");
      setCity((profile as any).city ?? "");
      setAddress((profile as any).address ?? "");
      setDob((profile as any).date_of_birth ?? "");
      setDegree(profile.degree ?? "");
      setGermanLevel(profile.german_level ?? "");
    }
  }, [profile]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(220,91%,54%)]" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checks: Array<string | null> = [
      validateFullName(fullName),
      validatePhone(phone),
      validateCountry(country),
      validateCity(city),
      validateAddress(address),
      validateDegree(degree),
      validateGermanLevel(germanLevel),
    ];
    const firstError = checks.find((m) => m);
    if (firstError) {
      return toast({ title: "Please correct your details", description: firstError, variant: "destructive" });
    }

    setSaving(true);
    const { error } = await supabase
      .from("ssra_profiles")
      .update({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        country,
        city: city.trim(),
        address: address.trim(),
        date_of_birth: dob || null,
        degree,
        german_level: germanLevel,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile completed", description: "Welcome aboard." });
    const next = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    // Force reload so useSsraAuth re-fetches profile
    window.location.href = next;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <BackButton className="mb-4" />
        <div className="flex flex-col items-center mb-6">
          <SsraLogo size={40} />
          <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Required to continue
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="font-display text-xl font-bold text-slate-900">Complete your profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            We need a few more details before you can access courses.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Field label="Full Name *">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
            </Field>
            <Field label="Phone Number *">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20}
                placeholder="+20 1XX XXX XXXX"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
            </Field>
            <Field label="Country *">
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30">
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="City *">
              <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={100}
                placeholder="e.g. Cairo"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
            </Field>
            <Field label="Full Address *">
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} rows={2}
                placeholder="Street, building, apartment…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30 resize-none" />
            </Field>
            <Field label="Date of Birth">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30" />
            </Field>

            <Field label="Degree / Qualification *">
              <select value={degree} onChange={(e) => setDegree(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30">
                <option value="">Select degree…</option>
                {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="German Level *">
              <select value={germanLevel} onChange={(e) => setGermanLevel(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(220,91%,54%)]/30">
                <option value="">Select German level…</option>
                {GERMAN_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>

            <button type="submit" disabled={saving}
              className="w-full h-11 mt-2 rounded-xl bg-[hsl(220,91%,54%)] text-white font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save and continue
            </button>
          </form>

          <button onClick={ssraSignOut}
            className="w-full mt-3 text-xs text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1.5">
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
