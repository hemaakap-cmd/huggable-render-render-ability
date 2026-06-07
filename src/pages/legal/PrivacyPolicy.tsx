import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Shield, Mail, Lock, Eye, Database, Trash2, AlertCircle } from "lucide-react";
import BackButton from "@/components/ssra/BackButton";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | SSRA Academy</title>
        <meta name="description" content="SSRA Academy privacy policy — how we collect, use, and protect your personal data." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-16">
        <div className="absolute inset-0 bg-[hsl(220,91%,54%)]/10" />
        <div className="container relative z-10 text-center">
          <BackButton className="text-white/70 hover:text-white mb-4" />
          <div className="inline-flex items-center gap-2 badge-blue mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Your Data Matters</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 font-display">
            Privacy Policy
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            We are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you use SSRA Academy services.
          </p>
          <p className="text-sm text-slate-400 mt-4">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-slate-50">
        <div className="container max-w-4xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12 space-y-12">

            {/* 1. Introduction */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">1. Introduction</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                SSRA academy ("we", "our", "us") is the data controller for personal data collected through our website and services. This privacy policy explains how we look after your personal data, what we share with our service providers (including Paddle.com, our Merchant of Record for payments), and what your privacy rights are under applicable law.
              </p>
            </div>

            <div className="divider" />

            {/* 2. Data We Collect */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">2. Data We Collect</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong className="text-slate-800">Identity Data:</strong> first name, last name, username or similar identifier.</li>
                  <li><strong className="text-slate-800">Contact Data:</strong> email address and telephone numbers.</li>
                  <li><strong className="text-slate-800">Technical Data:</strong> internet protocol (IP) address, browser type and version, time zone setting, browser plug-in types and versions, operating system and platform.</li>
                  <li><strong className="text-slate-800">Usage Data:</strong> information about how you use our website and services.</li>
                  <li><strong className="text-slate-800">Marketing and Communications Data:</strong> your preferences in receiving marketing from us and your communication preferences.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 3. How We Use Your Data */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">3. How We Use Your Data</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>To register you as a new student and provide our educational services.</li>
                  <li>To process and deliver your course subscription including managing payments and collecting money owed.</li>
                  <li>To manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
                  <li>To enable you to participate in interactive features of our service.</li>
                  <li>To improve our website, products/services, marketing, and customer relationships.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 4. Data Security */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">4. Data Security</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
              </p>
            </div>

            <div className="divider" />

            {/* 4b. Data Sharing */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">5. Data Sharing</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>We share personal data with the following categories of recipients only as needed to provide our services:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong className="text-slate-800">Paddle.com</strong> — our Merchant of Record, which handles checkout, payments, subscription management, tax compliance, invoicing, and refund requests. Where applicable, Paddle uses appropriate international transfer safeguards including the EU Standard Contractual Clauses and the EU-US Data Privacy Framework.</li>
                  <li><strong className="text-slate-800">Hosting & infrastructure providers</strong> — for website hosting, database storage, and email delivery.</li>
                  <li><strong className="text-slate-800">Authorities</strong> — where required by law or to protect our legal rights.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 5. Data Retention */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">5. Data Retention</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements. To determine the appropriate retention period for personal data, we consider the amount, nature, and sensitivity of the personal data, the potential risk of harm from unauthorized use or disclosure, and whether we can achieve those purposes through other means.
              </p>
            </div>

            <div className="divider" />

            {/* 6. Your Legal Rights */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">6. Your Legal Rights</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Request access to your personal data.</li>
                  <li>Request correction of your personal data.</li>
                  <li>Request erasure of your personal data.</li>
                  <li>Object to processing of your personal data.</li>
                  <li>Request restriction of processing your personal data.</li>
                  <li>Request transfer of your personal data.</li>
                  <li>Withdraw consent at any time where we are relying on consent to process your personal data.</li>
                </ul>
              </div>
            </div>

            <div className="divider" />

            {/* 7. Contact Us */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(220,91%,54%)]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[hsl(220,91%,54%)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 font-display">7. Contact Us</h2>
              </div>
              <p className="text-slate-600 leading-relaxed mb-4">
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
              </p>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <p className="text-slate-800 font-semibold">SSRA academy</p>
                <p className="text-slate-600">Data Controller: SSRA academy</p>
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
