import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, Globe2, CheckCircle2,
  CreditCard, Crown, Calendar, User, Tv, Users, AlertCircle, Loader2,
} from "lucide-react";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { COURSES, getCourse } from "@/lib/courseCatalog";
import { usePriceHiddenMap, useCourseSchedule, useCourseCapacity, useJoinWaitlist } from "@/hooks/useSsraData";
import { useSsraAuth } from "@/hooks/useSsraAuth";
import { useToast } from "@/hooks/use-toast";

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return d; }
}
function formatTime(t?: string | null) {
  if (!t) return null;
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export default function CourseDetail() {
  const { id = "" } = useParams();
  const navigate   = useNavigate();
  const { user }   = useSsraAuth();
  const { toast }  = useToast();
  const course     = getCourse(id);
  const { data: priceHidden = {} } = usePriceHiddenMap();
  const { data: schedule }         = useCourseSchedule(id);
  const { data: capacity }         = useCourseCapacity(id);
  const joinWaitlist               = useJoinWaitlist();
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const hidden   = !!priceHidden[id];
  const isFull   = capacity ? capacity.enrolled_count >= capacity.capacity : false;
  const seatsLeft = capacity ? Math.max(0, capacity.capacity - capacity.enrolled_count) : null;

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const handleWaitlist = async () => {
    if (!user) { navigate(`/login?redirect=/courses/${id}`); return; }
    setJoiningWaitlist(true);
    try {
      await joinWaitlist.mutateAsync(id);
      toast({ title: "Added to waitlist", description: "We'll notify you when a seat opens up." });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally { setJoiningWaitlist(false); }
  };

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
    navigate(`/checkout?courseId=${course.id}`);
  };

  const related = COURSES.filter((c) => c.category === course.category && c.id !== course.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{course.subtitle} | SSRA Academy</title>
        <meta name="description" content={course.desc.slice(0, 155)} />
        <link rel="canonical" href={`https://ssracourses.com/courses/${course.id}`} />
        <meta property="og:title" content={`${course.subtitle} | SSRA Academy`} />
        <meta property="og:description" content={course.desc.slice(0, 155)} />
        <meta property="og:url" content={`https://ssracourses.com/courses/${course.id}`} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.subtitle,
          description: course.desc,
          url: `https://ssracourses.com/courses/${course.id}`,
          provider: {
            "@type": "Organization",
            name: "SSRA Academy",
            sameAs: "https://ssracourses.com",
          },
          inLanguage: ["ar", "de"],
        })}</script>
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
            {hidden ? (
              <span className="badge-gold flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Coming soon · قريبًا
              </span>
            ) : course.type === "subscription" ? (
              <span className="badge-gold flex items-center gap-1">
                <Crown className="w-3 h-3" /> Subscription · €{course.price}/mo
              </span>
            ) : (
              <span className="badge-gold flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> €{course.price} one-time
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20 capitalize">
              {course.category}
            </span>

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

            {/* Schedule & instructor — live data from DB */}
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-5">Schedule & instructor</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                  <Calendar className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Start date</div>
                    <div className="text-sm text-slate-800 mt-0.5">{formatDate(schedule?.start_date) ?? "To be announced"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                  <Clock className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Start time</div>
                    <div className="text-sm text-slate-800 mt-0.5">{formatTime(schedule?.start_time) ?? "To be announced"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                  <BookOpen className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Duration</div>
                    <div className="text-sm text-slate-800 mt-0.5">{schedule?.duration || course.weeks}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                  <Tv className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Course type</div>
                    <div className="text-sm text-slate-800 mt-0.5 capitalize">{schedule?.course_format ?? "Online"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl sm:col-span-2">
                  <User className="w-5 h-5 text-[hsl(220,91%,54%)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Instructor</div>
                    <div className="text-sm text-slate-800 mt-0.5">{schedule?.instructor_name ?? "To be announced"}</div>
                  </div>
                </div>
              </div>
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
                {hidden ? (
                  <div className="font-display text-2xl font-bold text-slate-900">
                    Coming soon
                    <div className="text-xs font-normal text-slate-400 mt-1">قريبًا</div>
                  </div>
                ) : course.type === "subscription" ? (
                  <div className="font-display text-3xl font-bold text-slate-900">
                    €{course.price}
                    <span className="text-base font-medium text-slate-400">/month</span>
                  </div>
                ) : (
                  <div className="font-display text-3xl font-bold text-slate-900">
                    €{course.price}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6 text-sm text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex justify-between"><span>Duration</span><span className="font-medium text-slate-800">{course.weeks}</span></div>
                <div className="flex justify-between"><span>Level</span><span className="font-medium text-slate-800">{course.level}</span></div>
                <div className="flex justify-between"><span>Modules</span><span className="font-medium text-slate-800">{course.modules.length}</span></div>
                <div className="flex justify-between"><span>Format</span><span className="font-medium text-slate-800 capitalize">{course.type.replace("_", " ")}</span></div>
                {seatsLeft !== null && !hidden && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Seats</span>
                    <span className={`font-medium ${isFull ? "text-red-600" : seatsLeft <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                      {isFull ? "Sold out" : `${seatsLeft} remaining`}
                    </span>
                  </div>
                )}
              </div>

              {/* Capacity warning */}
              {!hidden && seatsLeft !== null && seatsLeft <= 10 && !isFull && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Only {seatsLeft} seat{seatsLeft !== 1 ? "s" : ""} left — enrol now before it fills.
                </div>
              )}

              {isFull && !hidden ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-semibold">
                    <AlertCircle className="w-4 h-4" /> Course is full
                  </div>
                  {capacity?.waitlist_enabled && (
                    <button
                      onClick={handleWaitlist}
                      disabled={joiningWaitlist}
                      className="w-full py-3 rounded-xl text-sm font-semibold border border-[hsl(220,91%,54%)] text-[hsl(220,91%,54%)] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {joiningWaitlist
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                        : <><Users className="w-4 h-4" /> Join Waitlist</>}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleEnrol}
                  disabled={hidden}
                  className="btn-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hidden ? "Coming soon" : "Enrol Now"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

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
