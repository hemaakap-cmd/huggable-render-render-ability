import { MessageCircle } from "lucide-react";

// Replace the number with the real WhatsApp number when known
const WA_NUMBER = "491234567890"; // placeholder — will be configured via env
const WA_MESSAGE = encodeURIComponent("Hi SSRA Academy! I'm interested in your courses.");

export default function WhatsAppButton() {
  const href = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all group"
    >
      <MessageCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm font-semibold max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 whitespace-nowrap">
        WhatsApp Us
      </span>
    </a>
  );
}
