import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Globe2, GraduationCap, Target, ArrowRight, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const VALUES = [
  {
    icon: Heart,
    title: "Non-Profit First",
    desc: "We exist to serve students, not shareholders. All revenue goes back into improving the academy and supporting students who cannot afford fees.",
  },
  {
    icon: Globe2,
    title: "Global Community",
    desc: "Our students come from Egypt, Morocco, Syria, Tunisia, Jordan, and beyond — united by a common goal: a career in German healthcare.",
  },
  {
    icon: Target,
    title: "Practical Focus",
    desc: "Every lesson is tied to a real scenario in the German healthcare system. We don't teach theory for theory's sake.",
  },
  {
    icon: GraduationCap,
    title: "Evidence-Based",
    desc: "Our curriculum is built with practising German sports therapists and physiotherapists to ensure it reflects current clinical standards.",
  },
];

const TEAM = [
  { name: "Dr. Khaled R.", role: "Founder & Sports Scientist", note: "12 years in German rehabilitation clinics" },
  { name: "Amira N.", role: "Language Programme Lead", note: "Certified DaF instructor, medical German specialist" },
  { name: "Markus W.", role: "Clinical Advisor", note: "Head physiotherapist, partner clinic Berlin" },
];

export default function About() {
  useReveal();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About — SSRA Academy</title>
        <meta name="description" content="SSRA Academy helps Arabic-speaking sports science graduates build careers in Germany. Our mission: accessible, high-quality education in Arabic." />
        <link rel="canonical" href="https://ssracourses.com/about" />
        <meta property="og:title" content="About SSRA Academy — Sports Science for Arabic Speakers" />
        <meta property="og:description" content="Our mission, team, and why we help Arabic-speaking sports scientists launch careers in Germany." />
        <meta property="og:url" content="https://ssracourses.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About SSRA Academy" />
        <meta name="twitter:description" content="Our mission and team — sports science education in Arabic, careers in Germany." />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>

      <Header />

      {/* Page hero */}
      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-20">
        <div className="container max-w-3xl text-center reveal">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-4">About SSRA</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6">
            Our Mission
          </h1>
          <p className="text-white opacity-60 text-lg leading-relaxed">
            SSRA was founded by sports scientists who immigrated to Germany and experienced first-hand how difficult the transition is. We built the resource we wished had existed.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                The Gap We're Closing
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Every year, hundreds of sports science graduates from Arabic-speaking countries arrive in Germany with solid academic qualifications — and find themselves lost. The German healthcare system has its own language, its own protocols, its own bureaucracy.
                </p>
                <p>
                  A degree in sports science from Cairo or Tunis is valuable. But without knowing how to call a health insurance company in German, how to write a therapy report, or how to get your credentials officially recognised, that degree stays locked away.
                </p>
                <p>
                  SSRA unlocks it. We're a non-profit online academy offering targeted, practical courses for this exact situation — in Arabic, in German, and in English.
                </p>
              </div>
            </div>

            <div className="reveal space-y-3">
              {[
                "Founded in Germany by sports scientists with migration experience",
                "Entirely online — study from anywhere in the world",
                "Courses in Arabic, German, and English",
                "Sliding-scale fees with full scholarships for financial need",
                "Active alumni network across Germany",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 p-4 rounded-xl bg-muted border border-border">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(43,96%,50%)] mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-[hsl(222,47%,9%)]">
        <div className="container">
          <div className="text-center mb-14 reveal">
            <h2 className="font-display text-4xl font-bold text-white mb-4">Our Values</h2>
            <p className="text-white opacity-50 max-w-md mx-auto">Everything we do flows from these four commitments.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-premium reveal bg-white bg-opacity-5 border border-white border-opacity-10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-lg bg-[hsl(43,96%,50%)] bg-opacity-15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[hsl(43,96%,50%)]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white opacity-55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="container">
          <div className="text-center mb-14 reveal">
            <span className="text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-3 block">The People Behind SSRA</span>
            <h2 className="font-display text-4xl font-bold text-foreground">Our Team</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {TEAM.map(({ name, role, note }) => (
              <div key={name} className="card-premium reveal bg-card border border-border rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(222,47%,20%)] to-[hsl(215,35%,30%)] flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-7 h-7 text-[hsl(43,96%,50%)]" />
                </div>
                <h3 className="font-semibold text-foreground">{name}</h3>
                <div className="text-sm text-[hsl(43,96%,50%)] mt-1">{role}</div>
                <p className="text-xs text-muted-foreground mt-2">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[hsl(222,47%,9%)]">
        <div className="container text-center reveal">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to join SSRA?</h2>
          <p className="text-white opacity-55 mb-8">Applications take less than 5 minutes. No fees required.</p>
          <Link to="/apply">
            <Button className="btn-luxury-primary px-10 py-4 rounded-xl text-base gap-2">
              Apply Now <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
