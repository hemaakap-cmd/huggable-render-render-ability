// Currency helpers shared by UI and checkout invocation.

export type SupportedCurrency = "EUR" | "EGP" | "SAR" | "TND";

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["EUR", "EGP", "SAR", "TND"];

// Stripe smallest-unit decimal places.
// TND is a 3-decimal currency in Stripe — amounts are in millimes.
export const CURRENCY_DECIMALS: Record<SupportedCurrency, number> = {
  EUR: 2,
  EGP: 2,
  SAR: 2,
  TND: 3,
};

export const CURRENCY_SYMBOL: Record<SupportedCurrency, string> = {
  EUR: "€",
  EGP: "E£",
  SAR: "ر.س",
  TND: "د.ت",
};

export function isSupportedCurrency(v: unknown): v is SupportedCurrency {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as string[]).includes(v);
}

// Convert a EUR amount to the target currency using a EUR→X rate.
export function convertFromEur(amountEur: number, currency: SupportedCurrency, rate: number): number {
  if (currency === "EUR") return amountEur;
  return amountEur * rate;
}

// Format a numeric amount in the local currency for display.
export function formatPrice(
  amountEur: number,
  currency: SupportedCurrency,
  rate: number,
  opts: { locale?: string } = {},
): string {
  const value = convertFromEur(amountEur, currency, rate);
  const locale = opts.locale ?? (typeof navigator !== "undefined" ? navigator.language : "en-EU");
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "TND" ? 0 : 0,
      minimumFractionDigits: 0,
    }).format(Math.round(value));
  } catch {
    return `${CURRENCY_SYMBOL[currency]} ${Math.round(value)}`;
  }
}

// Convert a EUR amount to the Stripe "smallest unit" integer for the given currency.
// Handles TND's 3-decimal quirk by rounding the last digit to 0 (Stripe requires this).
export function toStripeSmallestUnit(amountEur: number, currency: SupportedCurrency, rate: number): number {
  const local = convertFromEur(amountEur, currency, rate);
  const decimals = CURRENCY_DECIMALS[currency];
  const raw = Math.round(local * Math.pow(10, decimals));
  if (currency === "TND") {
    // Stripe requires the last digit to be 0 for 3-decimal currencies.
    return Math.round(raw / 10) * 10;
  }
  return raw;
}
