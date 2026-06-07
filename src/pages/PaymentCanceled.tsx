import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";

export default function PaymentCanceled() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
<Header />
<div className="container pt-20 pb-0">
  <BackButton />
</div>
      <div className="flex-1 flex items-center justify-center py-32 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-3">Payment Cancelled</h1>
          <p className="text-slate-500 mb-8">
            No charge was made. You can try again whenever you're ready.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/pricing">
              <button className="btn-primary px-6 py-3 rounded-xl text-sm font-semibold">
                View Pricing
              </button>
            </Link>
            <Link to="/">
              <button className="btn-outline px-6 py-3 rounded-xl text-sm font-semibold">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
