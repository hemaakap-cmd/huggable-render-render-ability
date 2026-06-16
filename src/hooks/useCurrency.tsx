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

const STORAGE_KEY = "ssra:currencyOverride";       // user-chosen currency
const STORAGE_COUNTRY_KEY = "ssra:overrideCountry"; // country at time of override

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
        const detectedCountry: string | null = data.country ?? null;
        setRates(data.rates ?? { EUR: 1 });
        setCountry(detectedCountry);

        // Read stored override + the country it was set under. If the user has
        // travelled (detected country changed since), discard the stale override
        // so they see the local currency of where they actually are now.
        let stored: string | null = null;
        let storedCountry: string | null = null;
        try {
          stored = window.localStorage.getItem(STORAGE_KEY);
          storedCountry = window.localStorage.getItem(STORAGE_COUNTRY_KEY);
        } catch { /* ignore */ }

        if (stored && storedCountry && detectedCountry && storedCountry !== detectedCountry) {
          try {
            window.localStorage.removeItem(STORAGE_KEY);
            window.localStorage.removeItem(STORAGE_COUNTRY_KEY);
          } catch { /* ignore */ }
          stored = null;
        }

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
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
      if (country) window.localStorage.setItem(STORAGE_COUNTRY_KEY, country);
    } catch { /* ignore */ }
  }, [rates, country]);

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
