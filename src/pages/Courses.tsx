import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Globe2, Clock, ArrowRight, Filter, CreditCard, Crown, AlertCircle } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { COURSES, type Course } from "@/lib/courseCatalog";
import { useCoursesCapacityMap } from "@/hooks/useSsraData";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

type Category = "all" | "clinical" | "language" | "career";

const TABS: { label: string; value: Category }[] = [
  { label: "All Courses", value: "all" },
  { label: "Clinical",    value: "clinical" },
  { label: "Language",    value: "language" },
  { label: "Career",      value: "career" },
];

function CourseRow({
  course,
  isFull = false,
}: {
  course: Course;
  isFull?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="card-lift reveal bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="grid md:grid-cols-4">
        {/* Color bar + icon */}
        <div className={`md:col-span-1 bg-gradient-to-br ${course.color} p-8 flex flex-col justify-between`}>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-5">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-1">{course.title}</h2>
            <p className="text-white/65 text-sm">{course.titleAr}</p>
          </div>
          <div className="mt-6 space-y-1.5 text-xs text-white/70">
            <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {course.weeks}</div>
            <div className="flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Level: {course.level}</div>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3 p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {course.price_hidden ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  <Clock className="w-3 h-3" /> Coming Soon
                </span>
              ) : course.type === "subscription" ? (
                <span className="badge-gold flex items-center gap-1"><Crown className="w-3 h-3" /> Subscription · €{course.price}/mo</span>
              ) : (
                <span className="badge-blue flex items-center gap-1"><CreditCard className="w-3 h-3" /> €{course.price} one-time</span>
              )}
              {!course.price_hidden && isFull && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                  <AlertCircle className="w-3 h-3" /> Sold Out
                </span>
              )}
            </div>

            <p className="text-slate-600 leading-relaxed mb-5 text-sm">{course.desc}</p>

            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Modules</div>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {course.modules.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(220,91%,54%)] shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            {course.price_hidden ? (
              <Link to="/contact" className="btn-outline px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 text-slate-500">
                Get Notified <ArrowRight className="w-4 h-4" />
              </Link>
            ) : isFull ? (
              <Link
                to={`/courses/${course.id}`}
                className="btn-outline px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 text-slate-600"
              >
                Join Waitlist <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => navigate(`/checkout?courseId=${course.id}`)}
                  className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  Enrol Now
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link to="/pricing" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  View pricing
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  useReveal();
  const [active, setActive] = useState<Category>("all");
  const { data: capacityMap = {} } = useCoursesCapacityMap();

  const filtered = active === "all" ? COURSES : COURSES.filter((c) => c.category === active);

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Courses — SSRA Academy</title>
        <meta name="description" content="9 courses for Arabic-speaking sports science graduates. Medical German, clinical rehabilitation, movement analysis, career entry in Germany. From €29." />
        <link rel="canonical" href="https://ssracourses.com/courses" />
        <meta property="og:title" content="SSRA Courses — Medical German & Rehabilitation in Arabic" />
        <meta property="og:description" content="9 specialised courses: Medical German, rehab, movement analysis, and career entry in Germany. From €29." />
        <meta property="og:url" content="https://ssracourses.com/courses" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SSRA Courses Catalogue" />
        <meta name="twitter:description" content="Medical German, rehab, movement analysis & career entry in Germany — taught in Arabic." />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>
<Header />
<div className="container pt-20 pb-0">
  <BackButton />
</div>

      {/* Hero */}
      <section className="bg-hero pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
        <div className="container max-w-3xl text-center relative reveal">
          <span className="badge-gold mb-6">9 Courses Available</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-5">
            SSRA Course Catalogue
          </h1>
          <p className="text-white/55 text-lg leading-relaxed max-w-xl mx-auto">
            From clinical foundations to German language fluency — every course designed for international sports science graduates targeting Germany.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-sm py-3">
        <div className="container flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          {TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActive(value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                active === value
                  ? "bg-[hsl(220,91%,54%)] text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} course{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Course list */}
      <section className="py-12">
        <div className="container space-y-6">
          {filtered.map((c) => (
            <CourseRow key={c.id} course={c} isFull={capacityMap[c.id]?.isFull ?? false} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-hero mt-8 relative overflow-hidden">
        <div className="container text-center reveal">
          <h2 className="font-display text-3xl font-bold text-white mb-4">Not sure which course to start with?</h2>
          <p className="text-white/55 mb-8 max-w-md mx-auto">Apply free and tell us your background — we'll recommend the best starting point.</p>
          <Link to="/apply">
            <button className="btn-gold px-10 py-4 rounded-xl text-base font-semibold flex items-center gap-2 mx-auto">
              Apply Free <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
