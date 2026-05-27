export type PaymobMethod = "card" | "fawry" | "vodafone_cash" | "orange_money";

export interface PaymobMethodConfig {
  id: PaymobMethod;
  label: string;
  labelAr: string;
  icon: string;
  description: string;
}

export const PAYMOB_METHODS: PaymobMethodConfig[] = [
  { id: "card",         label: "Visa / Mastercard", labelAr: "بطاقة بنكية",    icon: "💳", description: "Pay securely with your debit or credit card" },
  { id: "fawry",        label: "Fawry",              labelAr: "فوري",           icon: "🏪", description: "Pay at any Fawry outlet near you" },
  { id: "vodafone_cash",label: "Vodafone Cash",      labelAr: "فودافون كاش",   icon: "📱", description: "Pay via your Vodafone Cash wallet" },
  { id: "orange_money", label: "Orange Money",        labelAr: "أورانج موني",   icon: "🟠", description: "Pay via your Orange Money wallet" },
];

export function egpLabel(priceEgp: number): string {
  return `${priceEgp.toLocaleString("ar-EG")} ج.م`;
}
