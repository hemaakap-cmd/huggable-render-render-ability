import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Header from "@/components/ssra/Header";
import BackButton from "@/components/ssra/BackButton";
import Footer from "@/components/ssra/Footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
<Header />

      <div className="flex-1 flex items-center justify-center py-32">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-full bg-[hsl(43,96%,50%)] bg-opacity-10 flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-[hsl(43,96%,50%)]" />
          </div>
          <div className="text-7xl font-bold font-display text-[hsl(43,96%,50%)] mb-4">404</div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Page not found</h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist. Head back to the homepage.
          </p>
          <Link to="/">
            <Button className="btn-luxury-primary px-8 py-3 rounded-xl gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
