import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className = "", label = "رجوع" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors ${className}`}
      aria-label="رجوع للخلف"
    >
      <ArrowRight className="w-4 h-4" />
      {label}
    </button>
  );
}
