import { useEffect, useState } from "react";
import { Mail, MessageSquare, Globe2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: form.name, email: form.email, subject: form.subject, message: form.message },
      });
      if (error) throw new Error(error.message);
      toast({ title: "Message sent!", description: "We'll get back to you within 48 hours." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: unknown) {
      toast({ title: "Failed to send", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Contact — SSRA Academy</title>
        <meta name="description" content="Get in touch with SSRA Academy. We're here to help Arabic-speaking sports science graduates build their career in Germany." />
        <meta property="og:image" content="https://ssracourses.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://ssracourses.com/og-image.png" />
        <link rel="canonical" href="https://ssracourses.com/contact" />
      </Helmet>
      <Header />

      {/* Page hero */}
      <section className="bg-[hsl(222,47%,9%)] pt-32 pb-20">
        <div className="container max-w-2xl text-center reveal">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[hsl(43,96%,50%)] mb-4">Get in Touch</span>
          <h1 className="font-display text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-white opacity-60 leading-relaxed">
            Have a question about our courses, the application process, or anything else? We're here to help.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Info */}
            <div className="md:col-span-2 space-y-6 reveal">
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="md:col-span-3 reveal space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Question about Medical German course"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Write your question or message here…"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="btn-luxury-primary w-full py-3 rounded-xl gap-2 text-sm"
              >
                {sending ? t("contact.form.sending") : <><Send className="w-4 h-4" />{t("contact.form.send")}</>}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
