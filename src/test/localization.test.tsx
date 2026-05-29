import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import i18n from "@/i18n";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    roles: [],
    branchId: null,
    countryId: null,
    isAdmin: false,
    isSuperAdmin: false,
    isTherapist: false,
    isClient: false,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    hasRole: vi.fn().mockReturnValue(false),
  }),
}));

vi.mock("@/hooks/useTodayPendingBookings", () => ({
  useTodayPendingBookings: () => ({ data: 0 }),
}));

vi.mock("@/contexts/CountryContext", () => ({
  CountryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePublicCountry: () => ({
    countries: [
      {
        id: "country-de",
        name: "Germany",
        name_ar: null,
        code: "DE",
        currency_code: "EUR",
        currency_symbol: "€",
        timezone: "Europe/Berlin",
        default_language: "de",
        is_active: true,
      },
    ],
    selectedCountry: {
      id: "country-de",
      name: "Germany",
      name_ar: null,
      code: "DE",
      currency_code: "EUR",
      currency_symbol: "€",
      timezone: "Europe/Berlin",
      default_language: "de",
      is_active: true,
    },
    selectCountry: vi.fn(),
    loading: false,
    formatPrice: (amount: number) => `€${amount.toFixed(2)}`,
  }),
}));

vi.mock("@/hooks/useCountryServices", () => ({
  useCountryServices: () => ({
    loading: false,
    country: { id: "country-de", code: "DE" },
    services: [
      {
        id: "service-sports",
        name: "Sports Massage",
        name_ar: null,
        description: "Recovery massage for active bodies.",
        description_ar: null,
        duration_minutes: 50,
        price: 60,
        icon: "sports",
      },
      {
        id: "service-classic",
        name: "Classic Massage",
        name_ar: null,
        description: "Relaxing massage for everyday tension.",
        description_ar: null,
        duration_minutes: 25,
        price: 35,
        icon: "relaxation",
      },
    ],
  }),
}));

vi.mock("@/hooks/useManageBooking", () => ({
  useManageBooking: () => ({
    booking: null,
    isLoading: false,
    isError: false,
    error: null,
    reschedule: { mutateAsync: vi.fn(), isPending: false, error: null },
    cancel: { mutateAsync: vi.fn(), isPending: false, error: null },
  }),
}));

const createQueryResult = (data: unknown[] = []) => {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve({ data, count: data.length, error: null })),
    limit: vi.fn(() => Promise.resolve({ data, count: data.length, error: null })),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, count: data.length, error: null }).then(resolve),
  };
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => createQueryResult()),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import Index from "@/pages/Index";
import About from "@/pages/About";
import Services from "@/pages/Services";
import Contact from "@/pages/Contact";
import Cities from "@/pages/Cities";
import PaymentCanceled from "@/pages/PaymentCanceled";
import PaymentSuccess from "@/pages/PaymentSuccess";
import CancelBooking from "@/pages/CancelBooking";
import ManageBooking from "@/pages/ManageBooking";
import BookingPolicy from "@/pages/BookingPolicy";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Impressum from "@/pages/Impressum";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminVerify from "@/pages/admin/AdminVerify";
import StaffLogin from "@/pages/staff/StaffLogin";
import StaffVerify from "@/pages/staff/StaffVerify";
import GymCard from "@/components/gym/GymCard";

const labels = {
  de: {
    opposite: ["Find Your Gym", "Book Now", "Welcome Back", "Create Account", "Payment Canceled", "Manage Booking", "Send Verification Code"],
    pages: {
      home: ["Explore Courses"],
      about: ["Apply Now"],
      services: ["Jetzt buchen", "Finde dein Fitnessstudio"],
      contact: ["Nachricht senden", "Mehr erfahren"],
      cities: ["Fitnessstudio finden"],
      cityPage: ["Jetzt geöffnet", "Ansehen & buchen"],
      paymentCanceled: ["Erneut versuchen", "Zur Startseite"],
      paymentSuccess: ["Zur Startseite", "Weitere Buchung", "Buchung verwalten"],
      cancelBooking: ["Suchen"],
      manageBooking: ["Buchung suchen"],
      login: ["Anmelden", "Registrieren"],
      signup: ["Registrieren", "Anmelden"],
      adminLogin: ["Bestätigungscode senden"],
      staffLogin: ["Bestätigungscode senden"],
      verify: ["Bestätigen & anmelden", "Andere E-Mail verwenden"],
    },
  },
  en: {
    opposite: ["Finde dein Studio", "Jetzt buchen", "Willkommen zurück", "Konto erstellen", "Zahlung abgebrochen", "Buchung verwalten", "Bestätigungscode senden"],
    pages: {
      home: ["Explore Courses"],
      about: ["Apply Now"],
      services: ["Book Now", "Find Your Gym"],
      contact: ["Send Message", "Learn More"],
      cities: ["Find a Gym"],
      cityPage: ["Open now", "View & Book"],
      paymentCanceled: ["Try Again", "Back to Home"],
      paymentSuccess: ["Back to Home", "Book Another", "Manage your booking"],
      cancelBooking: ["Search"],
      manageBooking: ["Search Booking"],
      login: ["Sign In", "Sign Up"],
      signup: ["Sign Up", "Sign In"],
      adminLogin: ["Send Verification Code"],
      staffLogin: ["Send Verification Code"],
      verify: ["Verify & Sign In", "Use a different email"],
    },
  },
} as const;

type Language = keyof typeof labels;
type PageKey = keyof (typeof labels)["en"]["pages"];

const pageCases: Array<{ key: PageKey; path: string; element: React.ReactElement; state?: unknown }> = [
  { key: "home", path: "/", element: <Index /> },
  { key: "about", path: "/about", element: <About /> },
  { key: "services", path: "/services", element: <Services /> },
  { key: "contact", path: "/contact", element: <Contact /> },
  { key: "cities", path: "/cities", element: <Cities /> },
  { key: "paymentCanceled", path: "/payment-canceled", element: <PaymentCanceled /> },
  { key: "paymentSuccess", path: "/payment-success", element: <PaymentSuccess /> },
  { key: "cancelBooking", path: "/cancel-booking", element: <CancelBooking /> },
  { key: "manageBooking", path: "/manage-booking", element: <ManageBooking /> },
  { key: "login", path: "/login", element: <Login /> },
  { key: "signup", path: "/signup", element: <Signup /> },
  { key: "adminLogin", path: "/admin/login", element: <AdminLogin /> },
  { key: "staffLogin", path: "/staff/login", element: <StaffLogin /> },
  { key: "verify", path: "/admin/verify", element: <AdminVerify />, state: { email: "admin@example.com", allowedRoles: ["admin"] } },
  { key: "verify", path: "/staff/verify", element: <StaffVerify />, state: { email: "staff@example.com", allowedRoles: ["therapist"] } },
];

const textPageCases = [
  { path: "/booking-policy", element: <BookingPolicy />, de: "Buchungs- und Stornierungsrichtlinien", en: "Booking and Cancellation Policy" },
  { path: "/privacy-policy", element: <PrivacyPolicy />, de: "Datenschutzerklärung", en: "Privacy Policy" },
  { path: "/terms-of-service", element: <TermsOfService />, de: "Nutzungsbedingungen", en: "Terms of Service" },
  { path: "/impressum", element: <Impressum />, de: "Impressum", en: "Legal Notice" },
];

function renderRoute(path: string, element: React.ReactElement, state?: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[{ pathname: path, state }]}> 
            <Routes>
              <Route path={path} element={element} />
              <Route path="*" element={element} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

async function setLanguage(language: Language) {
  localStorage.setItem("i18nextLng", language);
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

function assertVisibleText(text: string) {
  expect(screen.getAllByText(text, { exact: false }).length).toBeGreaterThan(0);
}

function assertExpectedButtonsOrLinks(pageKey: PageKey, language: Language) {
  for (const label of labels[language].pages[pageKey]) {
    const interactive = screen.queryAllByRole("button", { name: new RegExp(label, "i") })
      .concat(screen.queryAllByRole("link", { name: new RegExp(label, "i") }));
    expect(interactive.length, `${language} ${pageKey} should show button/link: ${label}`).toBeGreaterThan(0);
  }
}

function assertNoOppositeLanguage(container: HTMLElement, language: Language) {
  const pageText = within(container).queryByText(new RegExp(labels[language].opposite.join("|"), "i"));
  expect(pageText).toBeNull();
}

describe("German and English page/button localization", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  it.each(pageCases)("renders localized buttons and links on $path", async ({ key, path, element, state }) => {
    for (const language of ["de", "en"] as Language[]) {
      await setLanguage(language);
      const { container, unmount } = renderRoute(path, element, state);

      await waitFor(() => assertExpectedButtonsOrLinks(key, language));
      assertNoOppositeLanguage(container, language);
      unmount();
    }
  });

  it.each(textPageCases)("renders localized text pages on $path", async ({ path, element, de, en }) => {
    for (const language of ["de", "en"] as Language[]) {
      await setLanguage(language);
      const { container, unmount } = renderRoute(path, element);

      assertVisibleText(language === "de" ? de : en);
      assertNoOppositeLanguage(container, language);
      unmount();
    }
  });

  it("renders localized gym card actions", async () => {
    for (const language of ["de", "en"] as Language[]) {
      await setLanguage(language);
      const { container, unmount } = renderRoute(
        "/gym-card",
        <GymCard id="gym-1" name="SportPark Bergisch Gladbach" address="Hauptstraße 45" rating={4.7} therapistCount={1} openNow />
      );

      assertVisibleText(labels[language].pages.cityPage[0]);
      const actionLabel = labels[language].pages.cityPage[1];
      expect(screen.getAllByRole("link", { name: new RegExp(actionLabel, "i") }).length).toBeGreaterThan(0);
      assertNoOppositeLanguage(container, language);
      unmount();
    }
  });
});
