const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  if (n < 100) return twoDigits(n);
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + twoDigits(n % 100) : "");
}

// Indian numbering: Crore, Lakh, Thousand, Hundred
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return "Zero";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = "";
  if (rupees >= 10000000) {
    words += threeDigits(Math.floor(rupees / 10000000)) + " Crore ";
  }
  const rem1 = rupees % 10000000;
  if (rem1 >= 100000) {
    words += twoDigits(Math.floor(rem1 / 100000)) + " Lakh ";
  }
  const rem2 = rem1 % 100000;
  if (rem2 >= 1000) {
    words += twoDigits(Math.floor(rem2 / 1000)) + " Thousand ";
  }
  const rem3 = rem2 % 1000;
  if (rem3 > 0) {
    words += threeDigits(rem3);
  }

  words = words.trim();
  if (!words) words = "Zero";

  let result = words + " Rupees";
  if (paise > 0) {
    result += " and " + twoDigits(paise) + " Paise";
  }
  result += " Only";
  return result;
}

// International numbering: Million, Thousand
export function numberToWords(amount: number, currency: string): string {
  if (currency === "INR") return numberToWordsINR(amount);

  if (amount === 0) return "Zero";

  const whole = Math.floor(amount);
  const frac = Math.round((amount - whole) * 100);

  let words = "";
  if (whole >= 1000000) {
    words += threeDigits(Math.floor(whole / 1000000)) + " Million ";
  }
  const rem1 = whole % 1000000;
  if (rem1 >= 1000) {
    words += threeDigits(Math.floor(rem1 / 1000)) + " Thousand ";
  }
  const rem2 = rem1 % 1000;
  if (rem2 > 0) {
    words += threeDigits(rem2);
  }

  words = words.trim();
  if (!words) words = "Zero";

  const currencyNames: Record<string, [string, string]> = {
    USD: ["Dollar", "Cents"],
    EUR: ["Euro", "Cents"],
    GBP: ["Pound", "Pence"],
    AUD: ["Dollar", "Cents"],
    SGD: ["Dollar", "Cents"],
    HKD: ["Dollar", "Cents"],
    AED: ["Dirham", "Fils"],
  };

  const [major, minor] = currencyNames[currency] || ["", ""];
  const pluralMajor = whole !== 1 && major ? major + "s" : major;

  let result = words;
  if (pluralMajor) result += " " + pluralMajor;
  if (frac > 0 && minor) {
    result += " and " + twoDigits(frac) + " " + minor;
  }
  result += " Only";
  return result;
}
