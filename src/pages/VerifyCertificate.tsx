import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Search, ShieldCheck, Calendar, GraduationCap, Award, Loader2 } from "lucide-react";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Certificate {
  id: string;
  certificate_code: string;
  student_name: string;
  course_title: string;
  grade: string | null;
  issued_at: string;
  revoked: boolean;
}

export default function VerifyCertificate() {
  const { code: routeCode } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(routeCode ?? "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cert, setCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (routeCode) void lookup(routeCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCode]);

  async function lookup(code: string) {
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .rpc("verify_ssra_certificate", { _code: code.trim().toUpperCase() });
    const row = Array.isArray(data) ? data[0] : null;
    setCert((row as Certificate | null) ?? null);
    setLoading(false);
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/verify/${encodeURIComponent(query.trim().toUpperCase())}`);
  };

  const isValid = cert && !cert.revoked;

  return (
    <div className="min-h-screen bg-background flex flex-col">
<Header />
<div className="container pt-20 pb-0">
  <BackButton />
</div>

      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-16">
        <div className="container max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(43,96%,50%)]/15 mb-5">
            <ShieldCheck className="w-8 h-8 text-[hsl(43,96%,50%)]" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
            Verify a Certificate
          </h1>
          <p className="text-white/60 leading-relaxed">
            Enter the certificate code (e.g. <span className="font-mono text-[hsl(43,96%,50%)]">SSRA-2026-XXXXXXXX</span>) to confirm authenticity.
          </p>
        </div>
      </section>

      <section className="py-14 flex-1">
        <div className="container max-w-2xl">
          <form onSubmit={onSubmit} className="flex gap-2 mb-10">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SSRA-2026-XXXXXXXX"
              className="h-12 font-mono uppercase tracking-wider"
            />
            <Button type="submit" className="btn-luxury-primary h-12 px-6">
              <Search className="w-4 h-4 mr-2" /> Verify
            </Button>
          </form>

          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Looking up certificate…
            </div>
          )}

          {!loading && searched && !cert && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-red-900 mb-1">Certificate not found</h2>
              <p className="text-red-700 text-sm">
                No certificate matches this code. Please double-check the spelling.
              </p>
            </div>
          )}

          {!loading && cert && !isValid && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="font-display text-2xl font-bold text-red-900 mb-1">Certificate revoked</h2>
              <p className="text-red-700 text-sm">This certificate is no longer valid.</p>
            </div>
          )}

          {!loading && isValid && (
            <div className="rounded-2xl border-2 border-[hsl(43,96%,50%)] bg-card overflow-hidden shadow-xl">
              <div className="bg-gradient-to-br from-[hsl(222,47%,11%)] to-[hsl(222,47%,9%)] p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(43,96%,50%)]/15 mb-4">
                  <CheckCircle2 className="w-9 h-9 text-[hsl(43,96%,50%)]" />
                </div>
                <div className="text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-2">
                  Verified · Authentic
                </div>
                <div className="font-mono text-white text-lg tracking-wider">
                  {cert.certificate_code}
                </div>
              </div>

              <div className="p-8 space-y-5">
                <Row icon={<Award className="w-5 h-5" />} label="Awarded to">
                  <span className="text-lg font-semibold text-foreground">{cert.student_name}</span>
                </Row>
                <Row icon={<GraduationCap className="w-5 h-5" />} label="Course">
                  <span className="font-medium text-foreground">{cert.course_title}</span>
                </Row>
                <Row icon={<Calendar className="w-5 h-5" />} label="Issued on">
                  <span className="text-foreground">
                    {new Date(cert.issued_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                </Row>
                {cert.grade && (
                  <Row icon={<ShieldCheck className="w-5 h-5" />} label="Grade">
                    <span className="font-medium text-foreground">{cert.grade}</span>
                  </Row>
                )}
                <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
                  Issued by Sports Science &amp; Rehabilitation Academy (SSRA) ·{" "}
                  <Link to="/about" className="text-[hsl(220,91%,54%)] hover:underline">About us</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-[hsl(220,91%,54%)] shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
