import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Languages, GraduationCap,
  CheckCircle2, Plane, Briefcase, Zap, Shield,
  CreditCard, ChevronRight,
} from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { COURSES, SUBSCRIPTION_COURSE } from "@/lib/stripe";
import heroBiomechanics from "@/assets/hero-biomechanics.jpg";

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

const STEPS = [
  { icon: GraduationCap, title: "For Sports Science Graduates", desc: "Built specifically for graduates of sports science and physiotherapy faculties who want to build a career abroad." },
  { icon: Languages,     title: "Medical & Professional German", desc: "Learn the exact German vocabulary you need for clinics, rehab centres, and patient communication." },
  { icon: Briefcase,     title: "Credential Recognition Support", desc: "Step-by-step guidance to get your diploma recognised and start working legally in Germany." },
  { icon: Plane,         title: "From Graduation to First Job",   desc: "A clear pathway: training, documents, applications — until you land your first contract abroad." },
];

const FEATURES = [
  { icon: Shield,    title: "Built by practitioners", desc: "Designed with sports scientists and physiotherapists already working in Germany." },
  { icon: Zap,       title: "Practical & job-focused", desc: "Scenario-based learning aimed at the real situations you will face on the job." },
  { icon: BookOpen,  title: "Structured pathway",     desc: "A clear curriculum from language basics to professional integration — no guesswork." },
  { icon: CreditCard,title: "Secure global payments", desc: "Enrol and pay securely from anywhere in the world via Stripe." },
];

export default function Index() {
  useReveal();

  const featuredCourses = COURSES.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center bg-hero overflow-hidden">
        {/* Biomechanics background image */}
        <div className="absolute inset-0">
          <img
            src={heroBiomechanics}
            alt="Athlete sprinting with biomechanics and anatomy overlay"
            width={1920}
            height={1080}
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[100px]" />
          <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full bg-indigo-800/30 blur-[100px]" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(0 0% 100% / 1) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container relative z-10 pt-20 md:pt-28 pb-14 md:pb-20">
          <div className="max-w-4xl mx-auto text-center px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/8 border border-white/15 text-white/80 text-[10px] md:text-xs font-medium mb-5 md:mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(43,96%,50%)] animate-pulse" />
              For sports science graduates · Just launched
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-4 md:mb-6">
              Sports Science Graduate?
              <br />
              <span className="text-gold-shimmer">Build Your Career</span>
              <br className="hidden sm:block" />
              <span className="sm:hidden"> Abroad.</span>
              <span className="hidden sm:inline"> Abroad.</span>
            </h1>

            <p className="text-white/60 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto mb-6 md:mb-10 px-2 sm:px-0">
              SSRA Academy helps graduates of sports science and physiotherapy faculties travel and work abroad — starting with Germany. Medical German, rehabilitation training, and credential recognition, all in one place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 md:mb-14">
              <Link to="/courses">
                <button className="btn-gold flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl text-sm md:text-base w-full sm:w-auto justify-center">
                  <span>Explore Courses</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link to="/apply">
                <button className="btn-outline-white flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-xl text-sm md:text-base w-full sm:w-auto justify-center">
                  <span>Apply Free</span>
                </button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:gap-8 text-[10px] sm:text-xs text-white/40">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Sports science grads</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Career-focused</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Secure payments</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" /> Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 20C480 40 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══ MISSION / WHO IT'S FOR ══ */}
      <section className="py-20 border-b border-slate-100">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 reveal px-4">
            <span className="badge-blue mb-3">Our Mission</span>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-slate-900 mb-3 md:mb-4">
              Helping sports science graduates work abroad
            </h2>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              Most sports science and physiotherapy graduates have the knowledge — but not the language, paperwork, or guidance to work abroad. SSRA Academy was created to close that gap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ icon: Icon, title, desc }) => (
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

      {/* ══ SUBSCRIPTION HIGHLIGHT ══ */}
      <section className="py-14 md:py-20 bg-slate-50">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="reveal grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
              <div className="bg-hero p-6 md:p-10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
                <div>
                  <div className="badge-gold mb-3 md:mb-4">Flagship Programme</div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                    Medical German<br className="hidden md:block" /> Subscription
                  </h2>
                  <p className="text-white/60 text-xs md:text-sm leading-relaxed mb-4 md:mb-6">
                    New modules every month. Medical vocabulary, patient communication, and B1 exam prep — designed for sports science graduates planning to work abroad.
                  </p>
                  <ul className="space-y-2 text-xs md:text-sm text-white/70">
                    {["New content monthly", "Medical vocabulary", "Patient communication", "B1 exam prep", "Cancel anytime"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[hsl(43,96%,50%)] shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 md:mt-8">
                  <div className="text-3xl md:text-4xl font-bold text-white font-display">
                    €{SUBSCRIPTION_COURSE.price}
                    <span className="text-sm md:text-base font-normal text-white/50">/month</span>
                  </div>
                  <div className="text-[10px] md:text-xs text-white/40 mt-1">Verified students only · Cancel anytime</div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-10 flex flex-col justify-center">
                <h3 className="font-display text-lg md:text-xl font-bold text-slate-900 mb-2">How to subscribe</h3>
                <p className="text-slate-500 text-xs md:text-sm mb-4 md:mb-6">Complete these steps to get access:</p>
                <ol className="space-y-3 md:space-y-4">
                  {[
                    { n: "1", t: "Apply free", d: "Submit your sports science diploma or student ID." },
                    { n: "2", t: "Verification", d: "We confirm your academic background." },
                    { n: "3", t: "Subscribe securely", d: "Pay via Stripe from anywhere in the world." },
                    { n: "4", t: "Start learning", d: "Immediate access to all current and future modules." },
                  ].map(({ n, t, d }) => (
                    <li key={n} className="flex gap-3 md:gap-4">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-[hsl(220,91%,54%)] text-white text-[10px] md:text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {n}
                      </div>
                      <div>
                        <div className="text-xs md:text-sm font-semibold text-slate-800">{t}</div>
                        <div className="text-[10px] md:text-xs text-slate-500">{d}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 md:mt-8 space-y-2 md:space-y-3">
                  <Link to="/apply">
                    <button className="btn-primary w-full py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center gap-2">
                      <span>Apply &amp; Subscribe</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link to="/courses">
                    <button className="btn-outline w-full py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold">
                      Browse all courses
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURED COURSES ══ */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div className="reveal">
              <span className="badge-blue mb-3">Course Catalogue</span>
              <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900">
                Build Your Career
                <br className="hidden sm:block" />
                Step by Step
              </h2>
            </div>
            <Link to="/courses" className="hidden md:flex items-center gap-1 text-sm font-semibold text-[hsl(220,91%,54%)] hover:underline reveal">
              View all courses <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {featuredCourses.map((course) => (
              <div key={course.id} className="card-lift reveal bg-white border border-slate-200 rounded-2xl overflow-hidden group">
                <div className={`h-2 bg-gradient-to-r ${course.color}`} />
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] md:text-xs font-semibold px-2 py-1 md:px-2.5 rounded-full ${
                      course.type === "subscription"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {course.type === "subscription" ? `€${course.price}/mo` : `€${course.price}`}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400">{course.weeks}</span>
                  </div>
                  <h3 className="font-display text-base md:text-lg font-bold text-slate-900 mb-2 md:mb-3">{course.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-3">{course.desc}</p>
                  <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] md:text-xs text-slate-400">{course.level}</span>
                    <Link to="/courses">
                      <button className="text-[10px] md:text-xs font-semibold text-[hsl(220,91%,54%)] hover:underline flex items-center gap-1">
                        Learn more <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 md:mt-8 text-center md:hidden reveal">
            <Link to="/courses">
              <button className="btn-outline px-6 py-2.5 md:px-8 md:py-3 rounded-xl text-sm">
                View all courses
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container px-4">
          <div className="text-center mb-10 md:mb-14 reveal">
            <span className="badge-blue mb-3">Why SSRA</span>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-slate-900">
              Built Different
            </h2>
            <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto mt-3 px-4">
              We know the exact challenges sports science graduates face when moving abroad — because we lived them.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-lift reveal bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center mb-3 md:mb-4">
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1 md:mb-2 text-sm">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-16 md:py-24 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 md:w-96 md:h-96 rounded-full bg-blue-500/15 blur-[80px] md:blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 rounded-full bg-indigo-600/20 blur-[60px] md:blur-[80px]" />
        </div>
        <div className="container relative text-center reveal px-4">
          <span className="badge-gold mb-4 md:mb-6">Free Application</span>
          <h2 className="font-display text-2xl md:text-4xl lg:text-6xl font-bold text-white mb-4 md:mb-5">
            Start Your Journey Today
          </h2>
          <p className="text-white/55 text-sm md:text-lg max-w-xl mx-auto mb-6 md:mb-10 px-2">
            Applications are free. Pay only for the courses you choose. Cancel subscriptions anytime.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/apply" className="w-full sm:w-auto">
              <button className="btn-gold flex items-center gap-2 px-8 md:px-10 py-3 md:py-4 rounded-xl text-sm md:text-base w-full justify-center">
                <span>Apply Now — Free</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto">
              <button className="btn-outline-white flex items-center gap-2 px-8 md:px-10 py-3 md:py-4 rounded-xl text-sm md:text-base w-full justify-center">
                <span>See Pricing</span>
              </button>
            </Link>
          </div>

          <div className="mt-8 md:mt-10 inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/8 border border-white/12 text-white/50 text-[10px] md:text-xs">
            <CreditCard className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Payments secured by Stripe
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
