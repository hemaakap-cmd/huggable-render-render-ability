import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Award, ExternalLink, Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";
import DashboardLayout from "@/components/ssra/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function MyCertificates() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ssra-my-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ssra_certificates")
        .select("*")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    toast({ title: "Code copied", description: code });
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-1">My Certificates</h1>
        <p className="text-sm text-slate-500 mb-8">Your earned course certificates. Share the code or verification link.</p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : !data?.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">No certificates yet</h3>
            <p className="text-sm text-slate-500">Complete a course to earn your first certificate.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[hsl(43,96%,50%)]/15 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6 text-[hsl(43,96%,50%)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{c.course_title}</h3>
                    <p className="text-xs text-slate-500 mb-1">
                      Issued {new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {c.grade && <> · Grade: {c.grade}</>}
                      {c.revoked && <span className="ml-2 text-red-600 font-medium">· Revoked</span>}
                    </p>
                    <button
                      onClick={() => copy(c.certificate_code)}
                      className="font-mono text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded inline-flex items-center gap-1.5"
                    >
                      {c.certificate_code}
                      {copied === c.certificate_code
                        ? <Check className="w-3 h-3 text-green-600" />
                        : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <Link
                  to={`/verify/${c.certificate_code}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(220,91%,54%)] hover:underline shrink-0"
                >
                  Verify link <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
