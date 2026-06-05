import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FileText, UserCheck, BookOpen, CreditCard, Ban, AlertTriangle, Scale } from "lucide-react";

export default function TermsConditions() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions | SSRA Academy</title>
        <meta name="description" content="SSRA Academy terms and conditions — rules and guidelines for using our platform and services." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-16">
        <div className="absolute inset-0 bg-[hsl(220,91%,54%)]/10" />
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 badge-blue mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Please Read Carefully</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 font-display">
            Terms & Conditions
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            These terms govern your use of SSRA Academy's website and services. By accessing or using our platform, you agree to be bound by these terms.
          </p>
          <p className="text-sm text-slate-400 mt-4">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-slate-50">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 space-y-12">

            {/* 1. Acceptance of Terms */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">1. Acceptance of Terms</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  By accessing or using the SSRA Academy website and services, you agree to be bound by these Terms and Conditions and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                </p>
                <p>
                  SSRA Academy provides online educational content and resources designed for sports science graduates preparing for careers abroad. Our services include language courses, professional training materials, and career guidance resources.
                </p>
              </div>
            </div>

            <div className="divider" />

            {/* 2. Use License */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">2. Use License</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>Permission is granted to temporarily access the materials on SSRA Academy's website for personal, non-commercial educational use only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Modify or copy the materials for commercial purposes.</li>
                  <li>Use the materials for any public display or commercial purpose.</li>
                  <li>Attempt to decompile or reverse engineer any software contained on SSRA Academy's website.</li>
                  <li>Remove any copyright or other proprietary notations from the materials.</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
                </ul>
                <p>This license shall automatically terminate if you violate any of these restrictions and may be terminated by SSRA Academy at any time.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 3. User Accounts */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">3. User Accounts</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>When you create an account with us, you must provide accurate, complete, and current information at all times. Failure to do so constitutes a breach of the terms, which may result in immediate termination of your account on our service.</p>
                <p>You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password. You agree not to disclose your password to any third party.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 4. Payment & Subscriptions */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">4. Payment & Subscriptions</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>SSRA Academy offers both one-time course purchases and paid subscription plans. By completing a purchase or selecting a paid subscription, you agree to pay all fees associated with the plan you select.</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.</li>
                  <li>Subscription fees are billed in advance on a monthly or annual basis depending on your selected plan.</li>
                  <li>Your subscription will automatically renew unless you cancel it before the renewal date.</li>
                  <li>You may cancel your subscription at any time through your account settings or by contacting us.</li>
                  <li>Payment, billing, tax, cancellation and refund mechanics are governed by Paddle's <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">Buyer Terms</a>.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 5. Refunds & Cancellations */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">5. Refunds & Cancellations</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>SSRA academy offers a <strong>14-day money-back guarantee</strong> on all course purchases and the first billing period of any subscription. Refunds are handled by Paddle.com, our Merchant of Record.</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>You may request a full refund within 14 days of your initial purchase or first subscription charge.</li>
                  <li>Refunds are processed by Paddle. Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">paddle.net</a> with the email address you used at checkout to request a refund directly.</li>
                  <li>You can also email us at <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline">info@ssracourses.com</a> with subject "Refund Request" and your order number and we will forward your request to Paddle.</li>
                  <li>Subscription cancellations take effect at the end of the current billing period; the subscription remains active until then.</li>
                  <li>Approved refunds are returned to the original payment method within 5–14 business days.</li>
                </ul>
                <p>Refund and cancellation mechanics are ultimately governed by Paddle's <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">Refund Policy</a> and <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">Buyer Terms</a>.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 6. Disclaimer */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">6. Disclaimer</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>The materials on SSRA Academy's website are provided on an 'as is' basis. SSRA Academy makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                <p>Furthermore, SSRA Academy does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.</p>
                <p>While we strive to provide accurate and up-to-date information, we do not guarantee job placement or visa approval abroad. Success depends on individual effort, qualifications, and external factors beyond our control.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 7. Governing Law */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">7. Governing Law</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                These terms and conditions are governed by and construed in accordance with the laws of Germany, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </div>

            <div className="divider" />

            {/* 8. Changes to Terms */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">8. Changes to Terms</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                SSRA Academy reserves the right, at its sole discretion, to modify or replace these terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </div>

            <div className="divider" />

            {/* 9. Contact Us */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">9. Contact Us</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have any questions about these Terms & Conditions, please contact us:
              </p>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <p className="text-slate-800 font-semibold">SSRA Academy</p>
                <p className="text-slate-600">Owner: Ibrahim Elatir</p>
                <p className="text-slate-600">Email: <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline">info@ssracourses.com</a></p>
                <p className="text-slate-600">Online · Germany</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="container text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">Ready to start your journey?</h3>
          <p className="text-slate-500 max-w-lg mx-auto mb-8">
            Join sports science graduates preparing for careers abroad. Apply for free today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/apply" className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold inline-block">
              Apply Free
            </Link>
            <Link to="/courses" className="btn-outline px-8 py-3 rounded-xl text-sm font-semibold inline-block">
              Explore Courses
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
