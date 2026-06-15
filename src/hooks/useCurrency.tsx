import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SupportedCurrency, isSupportedCurrency, formatPrice as fmt } from "@/lib/currency";

interface CurrencyState {
  currency: SupportedCurrency;
  rate: number;          // EUR -> currency
  country: string | null;
  loading: boolean;
  setCurrency: (c: SupportedCurrency) => void;
  format: (amountEur: number) => string;
}

const CurrencyContext = createContext<CurrencyState | null>(null);

const STORAGE_KEY = "ssra:currencyOverride";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>("EUR");
  const [rate, setRate] = useState<number>(1);
  const [rates, setRates] = useState<Record<string, number | null>>({ EUR: 1 });
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("geo-currency", { method: "GET" });
        if (cancelled || !data) return;
        const detected: SupportedCurrency = isSupportedCurrency(data.currency) ? data.currency : "EUR";
        setRates(data.rates ?? { EUR: 1 });
        setCountry(data.country ?? null);

        const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        const initial: SupportedCurrency = isSupportedCurrency(stored) ? stored : detected;
        setCurrencyState(initial);
        const r = initial === "EUR" ? 1 : Number(data.rates?.[initial]) || Number(data.rate) || 1;
        setRate(r);
      } catch {
        // keep defaults (EUR, rate=1)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((c: SupportedCurrency) => {
    setCurrencyState(c);
    const r = c === "EUR" ? 1 : Number(rates[c]) || 1;
    setRate(r);
    try { window.localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  }, [rates]);

  const value = useMemo<CurrencyState>(() => ({
    currency, rate, country, loading, setCurrency,
    format: (amountEur: number) => fmt(amountEur, currency, rate),
  }), [currency, rate, country, loading, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe fallback so components don't crash if provider is absent
    return {
      currency: "EUR", rate: 1, country: null, loading: false,
      setCurrency: () => {},
      format: (n: number) => `€${Math.round(n)}`,
    };
  }
  return ctx;
}
