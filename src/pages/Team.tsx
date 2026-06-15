import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Linkedin, Globe, Loader2, GraduationCap, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";

type PublicTeamMember = {
  id: string;
  full_name: string | null;
  role: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  country: string | null;
  social_links: Record<string, string>;
  team_display_order: number;
};

function MemberCard({ m }: { m: PublicTeamMember }) {
  return (
    <article className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg transition-shadow">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden mb-4 flex items-center justify-center text-2xl font-bold text-slate-400">
        {m.photo_url ? (
          <img src={m.photo_url} alt={m.full_name ?? ""} className="w-full h-full object-cover" />
        ) : (
          (m.full_name ?? "?")[0]?.toUpperCase()
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{m.full_name ?? "—"}</h3>
      {m.title && <p className="text-sm text-[hsl(220,91%,54%)] font-semibold mt-0.5">{m.title}</p>}
      {m.country && <p className="text-xs text-slate-400 mt-0.5">{m.country}</p>}
      {m.bio && <p className="text-sm text-slate-600 mt-3 leading-relaxed">{m.bio}</p>}
      {(m.social_links?.linkedin || m.social_links?.website) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          {m.social_links?.linkedin && (
            <a
              href={m.social_links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {m.social_links?.website && (
            <a
              href={m.social_links.website}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="Website"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function Team() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PublicTeamMember[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_public_team");
      if (!error && data) {
        setMembers((data as PublicTeamMember[]).map((m) => ({
          ...m,
          social_links: (m.social_links ?? {}) as Record<string, string>,
        })));
      }
      setLoading(false);
    })();
  }, []);

  const instructors = members.filter((m) => m.role === "instructor");
  const admins = members.filter((m) => m.role === "admin" || m.role === "super_admin");

  return (
    <>
      <Helmet>
        <title>Our Team — SSRA Academy</title>
        <meta name="description" content="Meet the instructors and administrators leading SSRA Academy's German radiology programs." />
        <link rel="canonical" href="/team" />
      </Helmet>
      <Header />
      <main className="pt-24 pb-20 bg-slate-50 min-h-screen">
        <div className="container max-w-6xl">
          <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Our Team</h1>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              The instructors and administrators behind SSRA Academy — experts dedicated to your journey into the German healthcare system.
            </p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 text-slate-500">Team profiles coming soon.</div>
          ) : (
            <>
              {instructors.length > 0 && (
                <section className="mb-14">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-6">
                    <GraduationCap className="w-5 h-5 text-[hsl(220,91%,54%)]" /> Instructors
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {instructors.map((m) => <MemberCard key={m.id} m={m} />)}
                  </div>
                </section>
              )}
              {admins.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-6">
                    <ShieldCheck className="w-5 h-5 text-amber-500" /> Administration
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {admins.map((m) => <MemberCard key={m.id} m={m} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
