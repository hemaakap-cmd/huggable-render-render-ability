import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2, ArrowRight, CreditCard, Shield, RefreshCcw,
  Globe2, Zap, Crown,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { COURSES, SUBSCRIPTION_COURSE, type Course } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

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

function PriceCard({ course, highlight = false }: { course: Course; highlight?: boolean }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (course.requires_verification) {
      navigate("/apply?course=" + course.id + "&intent=subscribe");
      return;
    }
    navigate("/checkout?courseId=" + course.id);
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        highlight
          ? "bg-hero border-2 border-[hsl(43,96%,50%)] shadow-2xl scale-[1.02]"
          : "bg-white border border-slate-200 card-lift"
      }`}
    >
      {highlight && (
        <div className="absolute top-4 right-4">
          <div className="badge-gold flex items-center gap-1">
            <Crown className="w-3 h-3" /> Most Popular
          </div>
        </div>
      )}

      <div className={`h-1.5 bg-gradient-to-r ${course.color}`} />

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? "text-white/50" : "text-slate-400"}`}>
            {course.category === "language" && course.type === "subscription" ? "Subscription" : course.category}
          </div>
          <h3 className={`font-display text-xl font-bold mb-1 ${highlight ? "text-white" : "text-slate-900"}`}>
            {course.title}
          </h3>
          <p className={`text-xs ${highlight ? "text-[hsl(43,96%,65%)]" : "text-[hsl(220,91%,54%)]"}`}>
            {course.titleAr}
          </p>
        </div>

        {/* Price */}
        <div className="mb-5">
          {course.price_hidden ? (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${highlight ? "bg-white/10 border border-white/20" : "bg-slate-100 border border-slate-200"}`}>
              <span className={`font-semibold text-sm ${highlight ? "text-white/70" : "text-slate-500"}`}>Coming Soon</span>
            </div>
          ) : (
            <>
              <span className={`text-4xl font-bold font-display ${highlight ? "text-white" : "text-slate-900"}`}>
                €{course.price}
              </span>
              {course.type === "subscription" && (
                <span className={`text-sm ml-1 ${highlight ? "text-white/50" : "text-slate-400"}`}>/month</span>
              )}
            </>
          )}
          <div className={`text-xs mt-1 ${highlight ? "text-white/40" : "text-slate-400"}`}>
            {course.price_hidden
              ? "Price will be announced soon"
              : course.type === "subscription" ? "Cancel anytime" : "One-time payment"}
            {!course.price_hidden && course.requires_verification && " · Verification required"}
          </div>
        </div>

        <p className={`text-sm leading-relaxed mb-5 ${highlight ? "text-white/65" : "text-slate-500"}`}>
          {course.desc}
        </p>

        {/* Modules */}
        <ul className="space-y-2 mb-6 flex-1">
          {course.modules.map((m) => (
            <li key={m} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${highlight ? "text-[hsl(43,96%,50%)]" : "text-[hsl(220,91%,54%)]"}`} />
              <span className={highlight ? "text-white/75" : "text-slate-600"}>{m}</span>
            </li>
          ))}
        </ul>

        {course.price_hidden ? (
          <Link to="/contact">
            <button className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              highlight ? "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20" : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
            }`}>
              Get Notified <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        ) : (
          <button
            onClick={handleCheckout}
            className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              highlight ? "btn-gold" : "btn-primary"
            }`}
          >
            {course.requires_verification ? "Apply & Subscribe" : "Enrol Now"}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {!course.price_hidden && course.type === "subscription" && (
          <p className={`text-center text-xs mt-2 ${highlight ? "text-white/35" : "text-slate-400"}`}>
            Requires sports science diploma or student ID
          </p>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  useReveal();

  const clinical  = COURSES.filter((c) => c.category === "clinical");
  const language  = COURSES.filter((c) => c.category === "language");
  const career    = COURSES.filter((c) => c.category === "career");

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Pricing — SSRA Academy</title>
        <meta name="description" content="Transparent pricing for all SSRA Academy courses. Medical German subscription from €19/month. One-time clinical and career courses from €29–€79." />
        <link rel="canonical" href="https://ssracourses.com/pricing" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>
      <Header />

      {/* Hero */}
      <section className="bg-hero pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/10 blur-[80px]" />
        </div>
        <div className="container text-center relative reveal">
          <span className="badge-gold mb-6">Transparent Pricing</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-4">
            Pay Only for What
            <br />
            You Actually Need
          </h1>
          <p className="text-white/55 text-lg max-w-xl mx-auto mb-8">
            One subscription for German language. Individual one-time payments for clinical and career courses. All orders processed by Paddle.com, our Merchant of Record.
          </p>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/8 border border-white/12 text-white/60 text-sm">
            <CreditCard className="w-4 h-4" />
            Visa · Mastercard · Apple Pay · Google Pay · International cards accepted
          </div>
        </div>
      </section>

      {/* Subscription spotlight */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="text-center mb-10 reveal">
            <span className="badge-blue mb-3">Subscription Course</span>
            <h2 className="font-display text-3xl font-bold text-slate-900">Ongoing German Language Access</h2>
            <p className="text-slate-500 text-sm mt-2">Requires proof of sports science graduation or enrolment.</p>
          </div>
          <div className="max-w-lg mx-auto reveal">
            <PriceCard course={SUBSCRIPTION_COURSE} highlight />
          </div>
        </div>
      </section>

      {/* Clinical courses */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="container">
          <div className="mb-10 reveal">
            <span className="badge-blue mb-3">Clinical Courses</span>
            <h2 className="font-display text-3xl font-bold text-slate-900">Sports Rehabilitation & Therapy</h2>
            <p className="text-slate-500 text-sm mt-2">One-time payment · No verification required</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinical.map((c) => <PriceCard key={c.id} course={c} />)}
          </div>
        </div>
      </section>

      {/* Language courses */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="container">
          <div className="mb-10 reveal">
            <span className="badge-blue mb-3">Language & Communication</span>
            <h2 className="font-display text-3xl font-bold text-slate-900">German &amp; Phone Skills</h2>
            <p className="text-slate-500 text-sm mt-2">One-time payment (except Medical German subscription)</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
            {language.filter((c) => c.type === "one_time").map((c) => <PriceCard key={c.id} course={c} />)}
          </div>
        </div>
      </section>

      {/* Career courses */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="container">
          <div className="mb-10 reveal">
            <span className="badge-blue mb-3">Career Courses</span>
            <h2 className="font-display text-3xl font-bold text-slate-900">Job Entry &amp; Credentials</h2>
            <p className="text-slate-500 text-sm mt-2">One-time payment · No verification required</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
            {career.map((c) => <PriceCard key={c.id} course={c} />)}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Shield,     title: "Secure Payments",   desc: "All payments processed by Stripe — PCI-DSS compliant, encrypted end-to-end." },
              { icon: Globe2,     title: "Global Cards",      desc: "Accept Visa, Mastercard, AMEX, Apple Pay, Google Pay, and SEPA from any country." },
              { icon: RefreshCcw, title: "Cancel Anytime",    desc: "Subscriptions can be cancelled at any time directly from your Stripe customer portal." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="reveal text-center p-6 rounded-2xl bg-white border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[hsl(220,91%,54%)]" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="container max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-8 text-center reveal">Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Why does the German language course require verification?", a: "We keep it exclusively for sports science graduates and students to ensure the community stays relevant and the content serves real needs." },
              { q: "Can I pay from Egypt, Morocco, or Syria?", a: "Yes — Stripe accepts cards and payment methods from virtually every country. If you have a Visa or Mastercard, you can enrol." },
              { q: "How do I cancel my subscription?", a: "You'll receive a link to your Stripe Customer Portal after subscribing. Cancel in one click, no questions asked." },
              { q: "Are there scholarships for students who cannot afford fees?", a: "Yes — mention your situation in the application form. We review every case and offer full or partial waivers for demonstrated financial need." },
              { q: "Do I get a certificate?", a: "Yes, every completed course includes a digital SSRA certificate of completion." },
            ].map(({ q, a }) => (
              <div key={q} className="reveal p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900 text-sm mb-2">{q}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
