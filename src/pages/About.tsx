import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Plane,
  GraduationCap,
  Target,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Shield,
  Globe,
  Users,
} from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const VALUES = [
  {
    icon: Heart,
    title: "Student-First",
    desc: "Every decision we make starts with one question: does this help a sports science graduate land a job abroad? If not, we do not build it.",
  },
  {
    icon: Plane,
    title: "Built for Abroad",
    desc: "We do not teach theory in a vacuum. Every module is designed around real employers, real visa requirements, and real workplace scenarios overseas.",
  },
  {
    icon: Target,
    title: "Practical Focus",
    desc: "From writing a therapy report in German to preparing for a clinic interview in English — every lesson ties to a real step in the relocation journey.",
  },
  {
    icon: Shield,
    title: "Trusted Pathway",
    desc: "Our curriculum is reviewed by practising sports therapists and physiotherapists already working in Germany, the UK, and the Gulf.",
  },
];

const TEAM = [
  {
    name: "Dr. Khaled R.",
    role: "Founder & Sports Scientist",
    note: "12 years in German rehabilitation clinics",
  },
  {
    name: "Amira N.",
    role: "Language Programme Lead",
    note: "Medical German specialist, DaF certified",
  },
  {
    name: "Markus W.",
    role: "Clinical Advisor",
    note: "Head physiotherapist, partner clinic Berlin",
  },
];

const WHY_ITEMS = [
  "Founded by sports scientists who relocated and rebuilt their careers abroad",
  "Fully online — study from home while you prepare your move",
  "Courses in English and German",
  "Scholarships available for graduates who need support",
  "Active alumni network across Germany, the UK, and the Gulf",
];

export default function About() {
  useReveal();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Page hero ── */}
      <section className="relative overflow-hidden bg-hero pt-32 pb-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[hsl(220,91%,54%)] opacity-[0.07] blur-3xl" />
          <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-[hsl(43,96%,50%)] opacity-[0.06] blur-3xl" />
        </div>
        <div className="container relative max-w-3xl text-center reveal">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(43,96%,50%)]/20 bg-[hsl(43,96%,50%)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[hsl(43,96%,50%)]">
            <Globe className="h-3.5 w-3.5" />
            About SSRA
          </span>
          <h1 className="mb-7 font-display text-5xl font-bold text-white md:text-6xl">
            Our Mission
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60">
            SSRA was founded by sports science graduates who moved abroad and
            experienced how hard the transition is. We are building the resource
            we wished had existed — a straight path from graduation to your first
            job overseas.
          </p>
        </div>
      </section>

      {/* ── Story ── */}
      <section className="py-24">
        <div className="container">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <div className="reveal">
              <h2 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">
                The Gap We Are Closing
              </h2>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <p>
                  Every year, sports science graduates finish university with solid
                  academic training — and then hit a wall. The real world of
                  working abroad has its own language, its own protocols, and its
                  own bureaucracy.
                </p>
                <p>
                  A degree in sports science is valuable. But without knowing how
                  to speak to a health insurer in German, how to format a therapy
                  report for a UK employer, or how to get your credentials
                  recognised overseas, that degree stays locked away.
                </p>
                <p>
                  SSRA unlocks it. We are an online academy offering targeted,
                  practical courses for sports science graduates who want to work
                  abroad — in English and in German.
                </p>
              </div>
            </div>

            <div className="reveal space-y-3">
              {WHY_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(43,96%,50%)]" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="relative overflow-hidden bg-hero py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-[hsl(220,91%,54%)] opacity-[0.05] blur-3xl" />
        </div>
        <div className="container relative">
          <div className="mb-14 text-center reveal">
            <h2 className="mb-4 font-display text-4xl font-bold text-white">
              Our Values
            </h2>
            <p className="mx-auto max-w-md text-white/50">
              Everything we do flows from these four commitments.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="reveal card-lift rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(43,96%,50%)]/15">
                  <Icon className="h-5 w-5 text-[hsl(43,96%,50%)]" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24">
        <div className="container">
          <div className="mb-14 text-center reveal">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[hsl(43,96%,50%)]">
              The People Behind SSRA
            </span>
            <h2 className="font-display text-4xl font-bold text-foreground">
              Our Team
            </h2>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
            {TEAM.map(({ name, role, note }) => (
              <div
                key={name}
                className="reveal card-lift rounded-2xl border border-border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(222,47%,20%)] to-[hsl(215,35%,30%)]">
                  <GraduationCap className="h-7 w-7 text-[hsl(43,96%,50%)]" />
                </div>
                <h3 className="font-semibold text-foreground">{name}</h3>
                <div className="mt-1 text-sm text-[hsl(43,96%,50%)]">
                  {role}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-hero py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 top-10 h-80 w-80 rounded-full bg-[hsl(220,91%,54%)] opacity-[0.06] blur-3xl" />
        </div>
        <div className="container relative text-center reveal">
          <h2 className="mb-4 font-display text-3xl font-bold text-white">
            Ready to build your career abroad?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-white/55">
            Applications take less than 5 minutes. Start your journey from
            graduation to your first job overseas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/apply">
              <Button className="btn-gold gap-2 rounded-xl px-10 py-4 text-base">
                Apply Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/courses">
              <Button className="btn-outline-white rounded-xl px-8 py-4 text-base">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
