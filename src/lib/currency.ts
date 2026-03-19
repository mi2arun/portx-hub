const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "US$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  SGD: "S$",
  AED: "AED ",
  HKD: "HK$",
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + " ";
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
