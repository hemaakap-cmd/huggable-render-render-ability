import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/ssra/Header";
import Footer from "@/components/ssra/Footer";

export default function Legal() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Legal — SSRA Academy</title>
        <meta name="description" content="Privacy Policy, Terms of Use, and Impressum for SSRA Academy." />
        <link rel="canonical" href="https://ssra-academy.de/legal" />
      </Helmet>
      <Header />

      <div className="container max-w-3xl py-32">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">Legal Information</h1>
        <p className="text-muted-foreground mb-12">Privacy Policy · Terms of Use · Impressum</p>

        {/* Privacy Policy */}
        <section id="privacy" className="mb-16 scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border">
            Privacy Policy
          </h2>
          <div className="prose prose-slate max-w-none space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong className="text-foreground">Last updated:</strong> May 2026</p>

            <h3 className="font-semibold text-foreground text-base mt-6">1. Data Controller</h3>
            <p>SSRA — Sports Science &amp; Rehabilitation Academy<br />
            Contact: info@ssra-academy.de</p>

            <h3 className="font-semibold text-foreground text-base mt-6">2. Data We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information: name, email address, country, academic degree</li>
              <li>Application data: German language level, course interest, motivation statement</li>
              <li>Payment data: processed exclusively by Stripe — we do not store card details</li>
              <li>Usage data: session logs, page visits (anonymised)</li>
            </ul>

            <h3 className="font-semibold text-foreground text-base mt-6">3. Purpose of Processing</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide course access and manage your enrolment</li>
              <li>To verify sports science credentials for restricted courses</li>
              <li>To send transactional emails (receipts, application status)</li>
              <li>To improve our platform and curriculum</li>
            </ul>

            <h3 className="font-semibold text-foreground text-base mt-6">4. Legal Basis (GDPR)</h3>
            <p>Processing is based on Art. 6(1)(b) GDPR (contract performance), Art. 6(1)(a) GDPR (consent where applicable), and Art. 6(1)(f) GDPR (legitimate interests).</p>

            <h3 className="font-semibold text-foreground text-base mt-6">5. Data Sharing</h3>
            <p>We share data only with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Stripe</strong> — payment processing (USA, EU-US Data Privacy Framework)</li>
              <li><strong className="text-foreground">Supabase</strong> — database hosting (EU region)</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery</li>
            </ul>
            <p>We never sell your data.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">6. Retention</h3>
            <p>We retain your data for as long as your account is active, plus up to 7 years for financial records as required by German law (§ 257 HGB).</p>

            <h3 className="font-semibold text-foreground text-base mt-6">7. Your Rights</h3>
            <p>Under GDPR you have the right to access, rectify, erase, restrict processing of, and port your data. You may also object to processing or withdraw consent. Contact us at info@ssra-academy.de to exercise these rights.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">8. Cookies</h3>
            <p>We use only essential cookies required for authentication and security. No third-party tracking or advertising cookies are used.</p>
          </div>
        </section>

        {/* Terms of Use */}
        <section id="terms" className="mb-16 scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border">
            Terms of Use
          </h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong className="text-foreground">Last updated:</strong> May 2026</p>

            <h3 className="font-semibold text-foreground text-base mt-6">1. Acceptance</h3>
            <p>By creating an account or purchasing a course on SSRA Academy, you agree to these Terms of Use.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">2. Eligibility</h3>
            <p>You must be at least 18 years old. The Medical German subscription requires a valid sports science diploma or proof of current enrolment.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">3. Course Access</h3>
            <p>Upon payment you receive a personal, non-transferable licence to access the purchased course content. Sharing login credentials or course materials with third parties is prohibited.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">4. Subscriptions &amp; Payments</h3>
            <p>Subscriptions renew monthly until cancelled. You can cancel at any time via the Stripe Customer Portal. No refunds are issued for partial billing periods. One-time course payments are non-refundable once course access has been activated.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">5. Intellectual Property</h3>
            <p>All course content — videos, documents, exercises — is owned by SSRA Academy. You may not reproduce, distribute, or create derivative works without written permission.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">6. Scholarships</h3>
            <p>Scholarship awards are at the sole discretion of SSRA Academy and may be revoked if the application was found to contain false information.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">7. Limitation of Liability</h3>
            <p>SSRA Academy is not liable for career outcomes, credential recognition decisions made by German authorities, or technical interruptions beyond our reasonable control.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">8. Governing Law</h3>
            <p>These terms are governed by German law. Disputes shall be submitted to the courts of Germany.</p>
          </div>
        </section>

        {/* Impressum */}
        <section id="impressum" className="scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 pb-3 border-b border-border">
            Impressum
          </h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p className="text-xs text-muted-foreground italic mb-4">
              Pflichtangaben gemäß § 5 TMG (Telemediengesetz)
            </p>

            <div className="p-5 rounded-xl bg-muted border border-border space-y-2">
              <p className="font-semibold text-foreground">SSRA — Sports Science &amp; Rehabilitation Academy</p>
              <p>Germany</p>
              <p>Email: <a href="mailto:info@ssra-academy.de" className="text-[hsl(220,91%,54%)] hover:underline">info@ssra-academy.de</a></p>
            </div>

            <h3 className="font-semibold text-foreground text-base mt-6">Haftungshinweis</h3>
            <p>Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">Urheberrecht</h3>
            <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
