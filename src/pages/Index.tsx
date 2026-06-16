import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Activity, Languages, GraduationCap,
  CheckCircle2, Users, Globe2, Zap, Shield,
  CreditCard, Play, ChevronRight,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { usePublicCourses } from "@/hooks/useSsraData";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import heroBiomechanics from "@/assets/hero-biomechanics.jpg";
import heroBiomechanicsMobile from "@/assets/hero-biomechanics-mobile.jpg";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

type HomeStats = {
  students_count: number;
  courses_count: number;
  countries_count: number;
  min_price: number | null;
};

function useHomeStats() {
  return useQuery({
    queryKey: ["public-home-stats"],
    queryFn: async (): Promise<HomeStats> => {
      const { data, error } = await supabase.rpc("get_public_home_stats");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        students_count: Number(row?.students_count ?? 0),
        courses_count: Number(row?.courses_count ?? 0),
        countries_count: Number(row?.countries_count ?? 0),
        min_price: row?.min_price != null ? Number(row.min_price) : null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

const FEATURES = [
  { icon: Shield,   title: "Verified Curriculum",   desc: "Every course reviewed by practising German sports scientists and physiotherapists." },
  { icon: Languages,title: "Arabic-First Support",  desc: "All modules explained in Arabic — no language barrier." },
  { icon: Zap,      title: "Job-Ready in Weeks",    desc: "Practical, scenario-based learning — not theory for theory's sake." },
  { icon: CreditCard,title:"Secure Global Payments",desc: "Pay securely from anywhere in the world via Paddle — all major cards accepted." },
];




export default function Index() {
  useReveal();

  const { data: courses = [] } = usePublicCourses();
  const { format } = useCurrency();
  const featuredCourses = courses.slice(0, 3);
  const subscriptionCourse = courses.find((course) => course.type === "subscription");
  const { data: stats } = useHomeStats();

  const STATS = [
    {
      value: stats ? String(stats.students_count) : "—",
      label: "Students enrolled",
      icon: Users,
    },
    {
      value: stats ? String(stats.courses_count) : "—",
      label: "Courses available",
      icon: BookOpen,
    },
    {
      value: stats ? String(stats.countries_count) : "—",
      label: "Countries",
      icon: Globe2,
    },
    {
      value: stats?.min_price != null ? format(stats.min_price) : "—",
      label: "Starting price",
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>SSRA Academy — Sports Science for Arabic Speakers</title>
        <meta name="description" content="Work in Germany as a sports scientist. Medical German, clinical courses and career support — all taught in Arabic." />
        <meta property="og:title" content="SSRA Academy — Work in Germany as a Sports Scientist" />
        <meta property="og:description" content="Medical German, clinical courses and career support for Arabic-speaking sports science graduates. From €29/month." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://ssracourses.com/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          "name": "SSRA Academy",
          "url": "https://ssracourses.com",
          "logo": "https://ssracourses.com/logo.svg",
          "description": "Online academy for Arabic-speaking sports science graduates pursuing careers in Germany.",
          "email": "info@ssracourses.com",
          "address": { "@type": "PostalAddress", "addressCountry": "DE" },
          "sameAs": [
            "https://www.instagram.com/ssra_academy?igsh=eTM0YnBvNzN4cTl1"
          ]
        })}</script>
      </Helmet>
      <Header />

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image — sports biomechanics (desktop) */}
        <img
          src={heroBiomechanics}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 hidden md:block"
        />
        {/* Background image — sports biomechanics (mobile portrait) */}
        <img
          src={heroBiomechanicsMobile}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center md:hidden"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-950/75" />
        {/* Hero gradient overlay for brand consistency */}
        <div className="absolute inset-0 bg-hero opacity-60" />

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full bg-indigo-800/30 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-slate-900/40 blur-[60px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(0 0% 100% / 1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container relative z-10 pt-24 pb-16 md:pt-28 md:pb-20">
          <div className="max-w-4xl mx-auto text-center">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/8 border border-white/15 text-white/80 text-[11px] md:text-xs font-medium mb-5 md:mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(43,96%,50%)] animate-pulse shrink-0" />
              <span>Sports Science &amp; Rehabilitation Academy · Germany</span>
            </div>

            <h1 className="font-display text-[2rem] leading-[1.1] sm:text-4xl md:text-7xl font-bold text-white md:leading-[1.05] mb-4 md:mb-6">
              Your Career in{" "}
              <span className="text-gold-shimmer">German Sports Rehabilitation</span>
            </h1>

            <p className="text-white/85 text-base md:text-xl leading-relaxed max-w-2xl mx-auto mb-8 md:mb-10">
              Evidence-based online courses for sports science graduates. Learn in Arabic, study German, and land your first job in Germany — all in one academy.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-10 md:mb-14">
              <Link to="/courses" className="w-full sm:w-auto">
                <button className="btn-gold w-full sm:w-auto flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-base">
                  <span>Explore Courses</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/apply" className="w-full sm:w-auto">
                <button className="btn-outline-white w-full sm:w-auto flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-base">
                  <span>Apply Free</span>
                </button>
              </Link>
            </div>

            {/* Trust row */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-8 text-[11px] md:text-xs text-white/75">
              <span className="flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Non-profit mission</span>
              <span className="flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Arabic support</span>
              <span className="flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Paddle secure</span>
              <span className="flex items-center gap-1.5 justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Cancel anytime</span>
            </div>
          </div>
        </div>


        {/* Bottom wave */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 20C480 40 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section className="py-12 border-b border-slate-100">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center reveal">
                <Icon className="w-5 h-5 text-[hsl(220,91%,54%)] mx-auto mb-2" />
                <div className="text-3xl font-bold font-display text-slate-900">{value}</div>
                <div className="text-sm text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SUBSCRIPTION HIGHLIGHT ══ */}
      {subscriptionCourse && <section className="py-20 bg-slate-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="reveal grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
              {/* Left dark panel */}
              <div className="bg-hero p-10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
                <div>
                  <div className="badge-gold mb-4">⭐ Most Popular</div>
                  <h2 className="font-display text-3xl font-bold text-white mb-3">
                    Medical German<br />Subscription
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">
                    New modules every month. Arabic-guided lessons. Medical vocabulary, patient communication, and B1 exam prep — all in one place.
                  </p>
                  <ul className="space-y-2 text-sm text-white/70">
                    {["New content monthly", "Arabic explanations", "Medical vocabulary", "B1 exam prep", "Cancel anytime"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[hsl(43,96%,50%)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <div className="text-4xl font-bold text-white font-display">
                    {format(subscriptionCourse.price)}
                    <span className="text-base font-normal text-white/50">/month</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1">Open to all · Cancel anytime</div>
                </div>
              </div>

              {/* Right white panel */}
              <div className="bg-white p-10 flex flex-col justify-center">
                <h3 className="font-display text-xl font-bold text-slate-900 mb-2">How to subscribe</h3>
                <p className="text-slate-500 text-sm mb-6">Complete these steps to get access:</p>
                <ol className="space-y-4">
                  {[
                    { n: "1", t: "Create free account", d: "Sign up in 30 seconds — no payment needed." },
                    { n: "2", t: "Choose your monthly support",  d: "Pay what you can — minimum €10/month. Renews automatically. Cancel anytime." },
                    { n: "3", t: "Start learning",        d: "Immediate access to all modules and live sessions." },
                  ].map(({ n, t, d }) => (
                    <li key={n} className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-[hsl(220,91%,54%)] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {n}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{t}</div>
                        <div className="text-xs text-slate-500">{d}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 space-y-3">
                  <Link to="/apply">
                    <button className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                      <span>Apply &amp; Subscribe</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link to="/courses">
                    <button className="btn-outline w-full py-3 rounded-xl text-sm font-semibold">
                      Browse all courses
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>}

      {/* ══ FEATURED COURSES ══ */}
      <section className="py-24">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div className="reveal">
              <span className="badge-blue mb-3">Course Catalogue</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-slate-900">
                Build Your German
                <br />
                Career Step by Step
              </h2>
            </div>
            <Link to="/courses" className="hidden md:flex items-center gap-1 text-sm font-semibold text-[hsl(220,91%,54%)] hover:underline reveal">
              View all courses <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredCourses.map((course) => (
              <div key={course.id} className="card-lift reveal bg-white border border-slate-200 rounded-2xl overflow-hidden group">
                <div className={`h-2 bg-gradient-to-r ${course.color}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      course.type === "subscription"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {course.price_hidden ? "Coming Soon" : course.type === "subscription" ? `${format(course.price)}/mo` : format(course.price)}
                    </span>
                    <span className="text-xs text-slate-400">{course.weeks}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 mb-1">{course.title}</h3>
                  <p className="text-xs text-[hsl(220,91%,54%)] font-medium mb-3">{course.titleAr}</p>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{course.desc}</p>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{course.level}</span>
                    <Link to="/courses">
                      <button className="text-xs font-semibold text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
                        View course details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden reveal">
            <Link to="/courses">
              <button className="btn-outline px-8 py-3 rounded-xl text-sm">
                View all 9 courses
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="py-24 bg-slate-50">
        <div className="container">
          <div className="text-center mb-14 reveal">
            <span className="badge-blue mb-3">Why SSRA</span>
            <h2 className="font-display text-4xl font-bold text-slate-900">
              Built Different
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mt-3">
              We know the exact challenges international graduates face in Germany because we lived them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-lift reveal bg-white border border-slate-200 rounded-2xl p-6">
                <div className="w-11 h-11 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* ══ CTA ══ */}
      <section className="py-24 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-500/15 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-600/20 blur-[80px]" />
        </div>
        <div className="container relative text-center reveal">
          <span className="badge-gold mb-6">Free Application</span>
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5">
            Start Learning Today
          </h2>
          <p className="text-white/55 text-lg max-w-xl mx-auto mb-10">
            Applications are free. Pay only for the courses you choose. Cancel subscriptions anytime at paddle.net. We accept cards from all over the world via Paddle, our Merchant of Record.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/apply">
              <button className="btn-gold flex items-center gap-2 px-10 py-4 rounded-xl text-base">
                <span>Apply Now — Free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link to="/pricing">
              <button className="btn-outline-white flex items-center gap-2 px-10 py-4 rounded-xl text-base">
                <span>See Pricing</span>
              </button>
            </Link>
          </div>

          {/* Paddle badge */}
          <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/12 text-white/50 text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            Payments processed by Paddle.com (Merchant of Record) · Visa · Mastercard · Apple Pay · Google Pay
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
