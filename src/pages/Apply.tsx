import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePublicCourses } from "@/hooks/useSsraData";

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

const STEPS = [
  { n: "01", title: "Fill the Form", desc: "Takes about 5 minutes." },
  { n: "02", title: "We Review",     desc: "We read every application personally within 3–5 days." },
  { n: "03", title: "Get Access",    desc: "Once approved, you'll receive an email to complete your subscription." },
];

export default function Apply() {
  useReveal();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("course") ?? "";
  const { data: courses = [] } = usePublicCourses();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gateStatus, setGateStatus] = useState<"checking" | "ok" | "pending" | "approved">("checking");
  const [form, setForm] = useState({
    fullName: "", email: "", country: "", degree: "",
    graduationYear: "", germanLevel: "", course: "", motivation: "",
  });

  // Pre-select course from query string
  useEffect(() => {
    if (courseIdParam && !form.course) {
      setForm((f) => ({ ...f, course: courseIdParam }));
    }
  }, [courseIdParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gate: approved → checkout; pending → status screen; otherwise show form
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setGateStatus("ok"); return; }
      const { data } = await supabase
        .from("ssra_verifications")
        .select("status, course_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const rows = data ?? [];
      const forCourse = courseIdParam ? rows.find((r) => r.course_id === courseIdParam) : undefined;
      const anyApproved = rows.some((r) => r.status === "approved");
      if (cancelled) return;
      if (forCourse?.status === "approved" || anyApproved) {
        const target = courseIdParam ? `/checkout?courseId=${courseIdParam}` : "/dashboard";
        toast({ title: "You're already approved", description: "Sending you to checkout." });
        navigate(target, { replace: true });
        setGateStatus("approved");
        return;
      }
      const pending =
        forCourse?.status === "pending" ||
        (!forCourse && rows.some((r) => r.status === "pending"));
      if (pending) { setGateStatus("pending"); return; }
      setGateStatus("ok");
    })();
    return () => { cancelled = true; };
  }, [courseIdParam, navigate, toast]);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic client-side guard before hitting the DB
    if (form.motivation.trim().length < 30) {
      toast({ title: "Please write a bit more", description: "Motivation must be at least 30 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Require auth so the insert is tied to a real user_id and is never silently dropped by RLS.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in first",
          description: "You need an account before submitting an application.",
        });
        navigate(`/login?redirect=${encodeURIComponent("/apply")}`);
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("ssra_verifications").insert({
        user_id:         user.id,
        full_name:       form.fullName,
        email:           form.email,
        country:         form.country,
        degree:          form.degree,
        graduation_year: form.graduationYear || null,
        german_level:    form.germanLevel,
        motivation:      form.motivation,
        course_id:       form.course || null,
        status:          "pending",
      });
      if (error) throw error;

      // Send confirmation + admin notification (non-blocking)
      supabase.functions.invoke("send-application-email", {
        body: {
          fullName:    form.fullName,
          email:       form.email,
          country:     form.country,
          degree:      form.degree,
          germanLevel: form.germanLevel,
          courseId:    form.course,
          motivation:  form.motivation,
        },
      }).catch((e) => console.warn("Email notification failed:", e));

      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll be in touch within 3–5 days." });
    } catch (err: unknown) {
      toast({ title: "Submission failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (gateStatus === "checking" || gateStatus === "approved") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-32 text-muted-foreground text-sm">
          Checking your application status…
        </div>
        <Footer />
      </div>
    );
  }

  if (gateStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="text-center max-w-md px-6 reveal">
            <BackButton className="mb-4" />
            <div className="w-20 h-20 rounded-full bg-[hsl(43,96%,50%)] bg-opacity-15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[hsl(43,96%,50%)]" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">Application Under Review</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              You've already submitted an application. Our team reviews every application personally and will respond within 3–5 business days. We'll email you as soon as it's approved.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="btn-luxury-primary px-6 py-3 rounded-xl">
              Go to Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center py-32">
          <div className="text-center max-w-md px-6 reveal">
            <BackButton className="mb-4" />
            <div className="w-20 h-20 rounded-full bg-[hsl(43,96%,50%)] bg-opacity-15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[hsl(43,96%,50%)]" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">Application Received!</h1>
            <p className="text-muted-foreground leading-relaxed">
              Thank you for applying to SSRA. We review every application personally and will reach out within 3–5 business days. Check your email for a confirmation.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Apply — SSRA Academy</title>
        <meta name="description" content="Apply free to SSRA Academy. Medical German, sports rehabilitation and career support for Arabic-speaking sports science graduates." />
        <link rel="canonical" href="https://ssracourses.com/apply" />
        <meta property="og:title" content="Apply — SSRA Academy" />
        <meta property="og:description" content="Apply free to SSRA Academy. Medical German, sports rehabilitation and career support for Arabic-speaking sports science graduates." />
        <meta property="og:url" content="https://ssracourses.com/apply" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>
      <Header />

      {/* Hero */}
      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-20">
        <div className="container max-w-2xl text-center reveal">
          <BackButton variant="dark" className="mb-4" />
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-4">Apply to SSRA</span>
          <h1 className="font-display text-5xl font-bold text-white mb-4">
            Start Your Journey
          </h1>
          <p className="text-white opacity-60 leading-relaxed">
            Free to apply. Open to all sports science graduates worldwide. Fill in the form below and we'll get back to you within 3–5 days.
          </p>
        </div>
      </section>

      {/* Process steps */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center reveal">
                <div className="text-3xl font-bold font-display text-[hsl(43,96%,50%)] mb-2">{n}</div>
                <div className="font-semibold text-foreground mb-1">{title}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-20">
        <div className="container max-w-2xl">
          <form onSubmit={handleSubmit} className="reveal space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[hsl(43,96%,50%)]" />
                Personal Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" value={form.fullName} onChange={set("fullName")} placeholder="Your full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country of Origin *</Label>
                  <Input id="country" value={form.country} onChange={set("country")} placeholder="e.g. Egypt, Morocco, Syria…" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="germanLevel">German Level</Label>
                  <select
                    id="germanLevel"
                    value={form.germanLevel}
                    onChange={set("germanLevel")}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select level…</option>
                    {["None / A0", "A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
              <h2 className="font-display text-xl font-semibold text-foreground">Academic Background</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="degree">Degree / Qualification *</Label>
                  <Input id="degree" value={form.degree} onChange={set("degree")} placeholder="e.g. BSc Sports Science" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input id="graduationYear" value={form.graduationYear} onChange={set("graduationYear")} placeholder="e.g. 2022" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border space-y-5">
              <h2 className="font-display text-xl font-semibold text-foreground">Course Selection</h2>

              <div className="space-y-1.5">
                <Label htmlFor="course">Which course interests you most?</Label>
                <select
                  id="course"
                  value={form.course}
                  onChange={set("course")}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.titleAr ? `${c.title} (${c.titleAr})` : c.title}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="motivation">Why do you want to work in Germany? *</Label>
                <Textarea
                  id="motivation"
                  rows={4}
                  value={form.motivation}
                  onChange={set("motivation")}
                  placeholder="Tell us briefly about your goals and situation…"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="btn-luxury-primary w-full py-4 rounded-xl text-base"
            >
              {submitting ? "Submitting…" : "Submit Application — Free"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By submitting you agree to our privacy policy. We never sell your data.
            </p>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
