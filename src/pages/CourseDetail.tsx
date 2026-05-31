import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, Globe2, CheckCircle2,
  CreditCard, Crown, ShieldCheck,
} from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { COURSES, getCourse } from "@/lib/stripe";
import { usePriceHiddenMap } from "@/hooks/useSsraData";

export default function CourseDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const course = getCourse(id);
  const { data: priceHidden = {} } = usePriceHiddenMap();
  const hidden = !!priceHidden[id];

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 container py-32 text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-4">Course not found</h1>
          <Link to="/courses" className="text-[hsl(220,91%,54%)] font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to all courses
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleEnrol = () => {
    if (course.requires_verification) {
      navigate(`/apply?course=${course.id}&intent=subscribe`);
    } else {
      navigate(`/checkout?courseId=${course.id}`);
    }
  };

  const related = COURSES.filter((c) => c.category === course.category && c.id !== course.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{course.subtitle} | SSRA Academy</title>
        <meta name="description" content={course.desc.slice(0, 155)} />
        <link rel="canonical" href={`/courses/${course.id}`} />
      </Helmet>
      <Header />

      {/* Hero */}
      <section className={`bg-gradient-to-br ${course.color} pt-32 pb-20 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-[80px] pointer-events-none" />
        <div className="container max-w-4xl relative">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All courses
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            {course.type === "subscription" ? (
              <span className="badge-gold flex items-center gap-1">
                <Crown className="w-3 h-3" /> Subscription · €{course.price}/mo
              </span>
            ) : (
              <span className="badge-gold flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Coming soon · قريبًا
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 capitalize">
              {course.category}
            </span>
            {course.requires_verification && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-100 border border-amber-300/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verification required
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
            {course.title}
          </h1>
          <p className="text-white/75 text-lg mb-2">{course.subtitle}</p>
          <p className="text-white/55 text-sm">{course.titleAr}</p>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-white/80">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" /> {course.weeks}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe2 className="w-4 h-4" /> Level: {course.level}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4" /> {course.modules.length} modules
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-16">
        <div className="container max-w-5xl grid lg:grid-cols-3 gap-10">
          {/* Main */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-3">About this course</h2>
              <p className="text-slate-600 leading-relaxed">{course.desc}</p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-5">What you'll cover</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {course.modules.map((m) => (
                  <li
                    key={m}
                    className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-3">Who it's for</h2>
              <p className="text-slate-600 leading-relaxed">
                Sports science graduates preparing to work abroad — especially in German clinics,
                rehab centres, and sports federations. Course taught in English with German technical
                terminology embedded throughout.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Price</div>
                {course.type === "subscription" ? (
                  <div className="font-display text-3xl font-bold text-slate-900">
                    €{course.price}
                    <span className="text-base font-medium text-slate-400">/month</span>
                  </div>
                ) : (
                  <div className="font-display text-2xl font-bold text-slate-900">
                    Coming soon
                    <div className="text-xs font-normal text-slate-400 mt-1">قريبًا</div>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6 text-sm text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex justify-between"><span>Duration</span><span className="font-medium text-slate-800">{course.weeks}</span></div>
                <div className="flex justify-between"><span>Level</span><span className="font-medium text-slate-800">{course.level}</span></div>
                <div className="flex justify-between"><span>Modules</span><span className="font-medium text-slate-800">{course.modules.length}</span></div>
                <div className="flex justify-between"><span>Format</span><span className="font-medium text-slate-800 capitalize">{course.type.replace("_", " ")}</span></div>
              </div>

              <button
                onClick={handleEnrol}
                disabled={course.type !== "subscription"}
                className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {course.type !== "subscription"
                  ? "Coming soon"
                  : course.requires_verification ? "Apply & Subscribe" : "Enrol Now"}
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/contact"
                className="block text-center text-sm text-slate-500 hover:text-slate-700 mt-3 transition-colors"
              >
                Have questions? Contact us
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">
              Related {course.category} courses
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {related.map((c) => (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="card-lift block bg-white border border-slate-200 rounded-xl overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${c.color} p-5`}>
                    <BookOpen className="w-5 h-5 text-white/80 mb-3" />
                    <div className="font-display text-base font-bold text-white leading-snug">{c.title}</div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-600 line-clamp-3 mb-3">{c.desc}</p>
                    <div className="text-sm font-semibold text-[hsl(220,91%,54%)] flex items-center gap-1">
                      View course <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
