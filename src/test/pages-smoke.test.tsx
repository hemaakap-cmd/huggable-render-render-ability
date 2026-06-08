import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";

/* ── Mock Supabase so auth-aware components (Header) and data hooks render ── */
const makeQuery = (data: unknown = null) => {
  const q: Record<string, unknown> = {
    select: vi.fn(() => q),
    eq:     vi.fn(() => q),
    in:     vi.fn(() => q),
    not:    vi.fn(() => q),
    order:  vi.fn(() => q),
    limit:  vi.fn(() => q),
    ilike:  vi.fn(() => q),
    or:     vi.fn(() => q),
    single:      vi.fn(() => Promise.resolve({ data, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: data ?? [], error: null }).then(resolve),
  };
  return q;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQuery()),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser:    vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import Index from "@/pages/Index";
import Courses from "@/pages/Courses";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Apply from "@/pages/Apply";
import Contact from "@/pages/Contact";
import Legal from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCanceled from "@/pages/PaymentCanceled";
import StudentLogin from "@/pages/StudentLogin";

function renderPage(element: React.ReactElement, path = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const publicPages: Array<{ name: string; element: React.ReactElement; path?: string }> = [
  { name: "Index",          element: <Index /> },
  { name: "Courses",        element: <Courses /> },
  { name: "Pricing",        element: <Pricing /> },
  { name: "About",          element: <About /> },
  { name: "Apply",          element: <Apply /> },
  { name: "Contact",        element: <Contact /> },
  { name: "Legal",          element: <Legal />, path: "/legal" },
  { name: "NotFound",       element: <NotFound /> },
  { name: "PaymentSuccess", element: <PaymentSuccess />, path: "/payment-success?courseId=medical-german" },
  { name: "PaymentCanceled",element: <PaymentCanceled /> },
  { name: "StudentLogin",   element: <StudentLogin />, path: "/login" },
];

describe("Public pages render without crashing", () => {
  afterEach(cleanup);

  it.each(publicPages)("renders $name", ({ element, path }) => {
    const { container } = renderPage(element, path);
    // A successful render produces real DOM content
    expect(container.querySelector("body, div")).toBeTruthy();
    expect(container.textContent && container.textContent.length).toBeGreaterThan(0);
  });
});

describe("Key page content", () => {
  afterEach(cleanup);

  it("shows a euro price on Pricing", () => {
    renderPage(<Pricing />, "/pricing");
    // Don't pin to a specific number — the catalog price evolves.
    expect(screen.getAllByText(/€\s?\d+/).length).toBeGreaterThan(0);
  });

  it("shows the application form heading on Apply", () => {
    renderPage(<Apply />, "/apply");
    expect(screen.getAllByText(/Start Your Journey/i).length).toBeGreaterThan(0);
  });

  it("renders a payment status panel on PaymentSuccess", () => {
    renderPage(<PaymentSuccess />, "/payment-success?courseId=medical-german");
    // Without a real session, the page sits in the "checking" state — assert the panel
    // is rendered (any of the three terminal/intermediate states is acceptable).
    expect(
      screen.queryAllByText(/Confirming your payment|Payment successful|verifying|enrolled/i).length
    ).toBeGreaterThan(0);
  });
});
