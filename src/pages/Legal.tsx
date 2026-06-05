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
        <link rel="canonical" href="https://ssracourses.com/legal" />
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
            <p>SSRA academy<br />
            Contact: info@ssracourses.com</p>

            <h3 className="font-semibold text-foreground text-base mt-6">2. Data We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information: name, email address, country, academic degree</li>
              <li>Application data: German language level, course interest, motivation statement</li>
              <li>Payment data: processed exclusively by Paddle.com (our Merchant of Record) — we do not store card details</li>
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
              <li><strong className="text-foreground">Paddle.com</strong> — our Merchant of Record, handles checkout, payment processing, subscription management, tax compliance, invoicing, and refund requests (UK/USA, EU Standard Contractual Clauses and EU-US Data Privacy Framework)</li>
              <li><strong className="text-foreground">Supabase</strong> — database hosting (EU region)</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery</li>
            </ul>
            <p>We never sell your data.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">6. Retention</h3>
            <p>We retain your data for as long as your account is active, plus up to 7 years for financial records as required by German law (§ 257 HGB).</p>

            <h3 className="font-semibold text-foreground text-base mt-6">7. Your Rights</h3>
            <p>Under GDPR you have the right to access, rectify, erase, restrict processing of, and port your data. You may also object to processing or withdraw consent. Contact us at info@ssracourses.com to exercise these rights.</p>

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
            <p>By creating an account or purchasing a course from SSRA academy, you agree to these Terms of Use.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">2. Eligibility</h3>
            <p>You must be at least 18 years old. The Medical German subscription requires a valid sports science diploma or proof of current enrolment.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">3. Course Access</h3>
            <p>Upon payment you receive a personal, non-transferable licence to access the purchased course content. Sharing login credentials or course materials with third parties is prohibited.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">4. Subscriptions &amp; Payments</h3>
            <p>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle will appear on your bank or card statement, handles all customer service inquiries related to billing, and processes refunds. Payment, billing, tax, cancellation and refund mechanics are governed by Paddle's <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">Buyer Terms</a>.</p>
            <p>Subscriptions renew automatically until cancelled. You can cancel at any time from your account dashboard or directly at <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">paddle.net</a> using the email address you used at checkout.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">4a. Refund Policy</h3>
            <p>We offer a <strong className="text-foreground">14-day money-back guarantee</strong> on all course purchases and the first billing period of any subscription. If you are not satisfied, you may request a full refund within 14 days of your order date.</p>
            <p>Refunds are handled by Paddle.com, our Merchant of Record. To request a refund:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">paddle.net</a> and enter the email address used at checkout to manage your order, or</li>
              <li>Email <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline">info@ssracourses.com</a> with subject "Refund Request" and your order number — we will forward your request to Paddle.</li>
            </ul>
            <p>Approved refunds are returned to the original payment method within 5–14 business days. Subscriptions cancelled after the 14-day window remain active until the end of the current paid period and are not refunded for the remaining period.</p>

            <h3 className="font-semibold text-foreground text-base mt-6">5. Intellectual Property</h3>
            <p>All course content — videos, documents, exercises — is owned by SSRA academy. You may not reproduce, distribute, or create derivative works without written permission.</p>

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
              <p className="font-semibold text-foreground">SSRA academy</p>
              <p>Germany</p>
              <p>Email: <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline">info@ssracourses.com</a></p>
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
