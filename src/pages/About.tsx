import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe2, GraduationCap, Lightbulb, HeartHandshake, ArrowRight, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
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
    icon: Globe2,
    title: "Bridging Worlds",
    desc: "We connect sports science expertise from Germany with the Arab world, making cutting-edge knowledge accessible to Arabic speakers everywhere.",
  },
  {
    icon: Lightbulb,
    title: "Culture of Growth",
    desc: "We spread a culture of continuous development, transferring expert knowledge into practical, evidence-based education — so learning evolves with the profession.",
  },
  {
    icon: HeartHandshake,
    title: "Youth First",
    desc: "We empower young professionals with skills, networks, and fair support — protecting recent graduates from exploitation wherever they choose to build their future.",
  },
  {
    icon: GraduationCap,
    title: "Sports Therapy & Rehab",
    desc: "We advance awareness of sports therapy, movement rehabilitation, and clinical sports science as vital, respected healthcare disciplines.",
  },
];

const TEAM = [
  { name: "Dr. Khaled R.", role: "Founder & Sports Scientist", note: "12 years in international rehabilitation clinics" },
  { name: "Amira N.", role: "Language Programme Lead", note: "Certified instructor, medical terminology specialist" },
  { name: "Markus W.", role: "Clinical Advisor", note: "Head physiotherapist, partner clinic network" },
];

export default function About() {
  useReveal();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About — SSRA Academy</title>
        <meta name="description" content="SSRA Academy is an academy founded in Germany spreading sports science knowledge to the Arab world. We connect sciences, empower learners, and advance sports therapy culture." />
        <link rel="canonical" href="https://ssracourses.com/about" />
        <meta property="og:title" content="About SSRA Academy — Sports Science for the Arab World" />
        <meta property="og:description" content="An academy founded in Germany connecting sports science with Arabic speakers worldwide. Modern knowledge, fair support, and professional growth." />
        <meta property="og:url" content="https://ssracourses.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About SSRA Academy" />
        <meta name="twitter:description" content="Academy founded in Germany spreading sports science to the Arab world — modern knowledge, professional growth." />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>

      <Header />

      {/* Page hero */}
      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-20">
        <div className="container max-w-3xl text-center reveal">
          <BackButton variant="dark" className="mb-4" />
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-4">About SSRA</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6">
            Our Mission
          </h1>
          <p className="text-white opacity-60 text-lg leading-relaxed">
            SSRA is a modern academy founded in Germany with a mission to spread sports science knowledge across the Arab world and to Arabic speakers globally — connecting disciplines, cultures, and people through education.
          </p>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why We Exist
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The world of sports science is advancing rapidly — but much of that knowledge remains locked behind language barriers and geographical borders. SSRA was founded to change that.
                </p>
                <p>
                  We believe Arabic-speaking students, graduates, and professionals deserve direct access to modern sports science, sports therapy, and rehabilitation knowledge — not outdated textbooks or second-hand translations.
                </p>
                <p>
                  Our goal is to build bridges: between expert knowledge and practical application, between experienced professionals and the next generation entering the field — wherever they choose to work.
                </p>
              </div>
            </div>

            <div className="reveal space-y-3">
              {[
                "Academy founded in Germany with a global Arabic-speaking community",
                "Modern, evidence-based sports science curriculum",
                "Courses delivered entirely in Arabic",
                "Fair support for graduates — no exploitation, no false promises",
                "Active professional network for knowledge exchange and growth",
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
            <p className="text-white opacity-50 max-w-md mx-auto">Everything we do is rooted in these four commitments.</p>
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
          <h2 className="font-display text-3xl font-bold text-white mb-4">Ready to grow with SSRA?</h2>
          <p className="text-white opacity-55 mb-8">Join a community built on knowledge, integrity, and shared growth.</p>
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
