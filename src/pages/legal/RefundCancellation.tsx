import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { RotateCcw, CalendarDays, CheckCircle, XCircle, Clock, HelpCircle, Mail } from "lucide-react";

export default function RefundCancellation() {
  return (
    <>
      <Helmet>
        <title>Refund & Cancellation | SSRA Academy</title>
        <meta name="description" content="SSRA Academy refund and cancellation policy — learn about our money-back guarantee and how to cancel your subscription." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-16">
        <div className="absolute inset-0 bg-[hsl(220,91%,54%)]/10" />
        <div className="container relative z-10 text-center">
          <div className="inline-flex items-center gap-2 badge-blue mb-4">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Transparent & Fair</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 font-display">
            Refund & Cancellation
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            We stand behind our courses. Learn about our refund guarantee, cancellation process, and how we handle subscription changes.
          </p>
          <p className="text-sm text-slate-400 mt-4">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Quick Summary Cards */}
      <section className="py-12 bg-slate-50">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">14-Day Guarantee</h3>
              <p className="text-sm text-slate-500">Full refund available within 14 days if less than 25% of course content has been accessed.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-[hsl(220,91%,54%)]/10 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-6 h-6 text-[hsl(220,91%,54%)]" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Cancel Anytime</h3>
              <p className="text-sm text-slate-500">No long-term contracts. Cancel your subscription at any time with no hidden fees.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Prorated Access</h3>
              <p className="text-sm text-slate-500">After cancellation, you keep access until the end of your current billing period.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl">
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-8 md:p-12 space-y-12">

            {/* 1. Overview */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">1. Our Commitment to You</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                At SSRA Academy, we believe in the quality of our educational programs. We want every sports science graduate who joins us to feel confident in their investment. If you are not satisfied with your purchase, we offer a straightforward refund and cancellation process designed to be fair and transparent.
              </p>
            </div>

            <div className="divider" />

            {/* 2. Refund Eligibility */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">2. Refund Eligibility</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>You are eligible for a full refund under the following conditions:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>You request a refund within 14 calendar days of your initial purchase date.</li>
                  <li>You have accessed less than 25% of the total course content.</li>
                  <li>This is your first refund request for the same course or subscription.</li>
                  <li>You purchased directly through our official website (not via a third-party reseller).</li>
                </ul>
                <p className="text-sm text-slate-500 italic mt-2">Note: If you have completed more than 25% of the course content, your refund request will be reviewed on a case-by-case basis.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 3. Non-Refundable Items */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">3. Non-Refundable Items</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>The following are not eligible for refunds:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Subscription renewals (after the initial 14-day period has passed).</li>
                  <li>Partial months or unused portions of a subscription period.</li>
                  <li>Downloaded materials, certificates, or digital assets that have been accessed.</li>
                  <li>Group or corporate packages purchased on behalf of multiple users.</li>
                  <li>Gift subscriptions redeemed by the recipient.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 4. How to Request a Refund */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">4. How to Request a Refund</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>Our payments are processed by Paddle.com, our Merchant of Record. To request a refund, please follow these steps:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline font-medium">paddle.net</a> and enter the email address used at checkout to manage your order and request a refund directly.</li>
                  <li>Or email us at <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline font-medium">info@ssracourses.com</a> with subject "Refund Request" and your order number — we will forward to Paddle.</li>
                  <li>Allow up to 5-10 business days for our team or Paddle to review your request.</li>
                </ol>
                <p>Approved refunds will be processed to the original payment method within 5-14 business days, depending on your bank or payment provider.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 5. Cancellation Policy */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">5. Cancellation Policy</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>You may cancel your subscription at any time. Here's what happens when you cancel:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong className="text-slate-800">Access until period end:</strong> You will continue to have full access to all course content until the end of your current billing period.</li>
                  <li><strong className="text-slate-800">No partial refunds:</strong> We do not provide partial refunds for unused days in a billing period.</li>
                  <li><strong className="text-slate-800">No reactivation fee:</strong> You can reactivate your subscription at any time without penalty.</li>
                  <li><strong className="text-slate-800">Data retention:</strong> Your progress and account data will be retained for 12 months in case you decide to return.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 6. How to Cancel */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">6. How to Cancel Your Subscription</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>You can cancel your subscription through any of the following methods:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong className="text-slate-800">Account Settings:</strong> Log into your SSRA Academy account, go to "My Subscription," and click "Cancel Subscription."</li>
                  <li><strong className="text-slate-800">Email:</strong> Send a cancellation request to <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline font-medium">info@ssracourses.com</a> from your registered email address.</li>
                  <li><strong className="text-slate-800">Paddle Customer Portal:</strong> Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-[hsl(220,91%,54%)] hover:underline">paddle.net</a> with the email used at checkout to cancel directly.</li>
                </ul>
                <p className="text-sm text-slate-500 italic">Cancellation requests are typically processed within 24-48 hours. You will receive a confirmation email once your cancellation is complete.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 7. Special Circumstances */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">7. Special Circumstances</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>We understand that life happens. In the following exceptional cases, we may offer refunds beyond our standard policy:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong className="text-slate-800">Medical emergencies:</strong> Documented medical conditions preventing course participation.</li>
                  <li><strong className="text-slate-800">Technical issues:</strong> Persistent platform failures that prevent access to course content (verified by our support team).</li>
                  <li><strong className="text-slate-800">Misrepresentation:</strong> If course content significantly deviates from published descriptions.</li>
                  <li><strong className="text-slate-800">Force majeure:</strong> Unforeseeable circumstances such as natural disasters or political events affecting your ability to study abroad.</li>
                </ul>
                <p>These cases are reviewed individually by our support team. Please contact us with supporting documentation.</p>
              </div>
            </div>

            <div className="divider" />

            {/* 8. Contact */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">8. Contact Us</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have any questions about our refund or cancellation policy, please don't hesitate to reach out:
              </p>
              <div className="bg-white rounded-xl p-6 border border-slate-100">
                <p className="text-slate-800 font-semibold">SSRA Academy Support</p>
                <p className="text-slate-600">Email: <a href="mailto:info@ssracourses.com" className="text-[hsl(220,91%,54%)] hover:underline">info@ssracourses.com</a></p>
                <p className="text-slate-600">Online · Germany</p>
                <p className="text-slate-500 text-sm mt-2">We aim to respond to all inquiries within 24-48 business hours.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="container text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">Still have questions?</h3>
          <p className="text-slate-500 max-w-lg mx-auto mb-8">
            Our support team is here to help. Reach out anytime for assistance with refunds, cancellations, or any other concerns.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/contact" className="btn-primary px-8 py-3 rounded-xl text-sm font-semibold inline-block">
              Contact Support
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
