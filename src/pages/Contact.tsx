import { useEffect } from "react";
import { Mail, MessageSquare, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";

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

export default function Contact() {
  useReveal();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Contact — SSRA Academy</title>
        <meta name="description" content="Get in touch with SSRA Academy. We're here to help Arabic-speaking sports science graduates build their career in Germany." />
        <link rel="canonical" href="https://ssracourses.com/contact" />
        <meta property="og:title" content="Contact SSRA Academy — Questions & Support" />
        <meta property="og:description" content="Reach our team for admissions, course questions, partnerships, or support — typically within one business day." />
        <meta property="og:url" content="https://ssracourses.com/contact" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact SSRA Academy" />
        <meta name="twitter:description" content="Admissions, course questions, partnerships and support." />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
      </Helmet>

      <Header />

      {/* Page hero */}
      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-20">
        <div className="container max-w-2xl text-center reveal">
          <BackButton className="text-white/70 hover:text-white mb-4" />
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-4">Get in Touch</span>
          <h1 className="font-display text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-white opacity-60 leading-relaxed">
            Have a question about our courses, the application process, or anything else? We're here to help.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-2xl">
          <div className="space-y-6 reveal">
            <div className="p-5 rounded-xl bg-card border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[hsl(43,96%,50%)] bg-opacity-10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[hsl(43,96%,50%)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground mb-1">Email</div>
                <div className="text-sm text-muted-foreground">info@ssracourses.com</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[hsl(43,96%,50%)] bg-opacity-10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-[hsl(43,96%,50%)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground mb-1">WhatsApp</div>
                <div className="text-sm text-muted-foreground">Available for enrolled students</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[hsl(43,96%,50%)] bg-opacity-10 flex items-center justify-center shrink-0">
                <Globe2 className="w-5 h-5 text-[hsl(43,96%,50%)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground mb-1">Language</div>
                <div className="text-sm text-muted-foreground">Arabic · German · English</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              We typically respond within 24–48 hours. For urgent matters related to your application, mention it in the subject line.
            </p>
            <Link to="/about" className="text-xs text-[hsl(220,91%,54%)] font-medium hover:underline mt-2 inline-block">
              {t("contact.faq.button")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
