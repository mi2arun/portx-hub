import { SalaryStructure, SlipLine } from "./types";

// Set to true once the company is registered for EPF/ESI — re-enables the
// auto-split carve-out and the PF/ESI fields in the employee form.
export const PF_ESI_ENABLED = false;

// Statutory constants (FY defaults — editable in the UI, states/rules vary)
export const EPF_RATE = 0.12;             // employee & employer each
export const EPF_WAGE_CEILING = 15000;    // statutory wage ceiling for EPF
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;
export const ESI_GROSS_LIMIT = 21000;     // ESI applies only if monthly gross ≤ this

export function monthlyGross(s: SalaryStructure): number {
  return (
    (s.basic || 0) +
    (s.hra || 0) +
    (s.conveyance_allowance || 0) +
    (s.medical_allowance || 0) +
    (s.special_allowance || 0) +
    (s.other_allowance || 0)
  );
}

export function monthlyDeductions(s: SalaryStructure): number {
  const pfEsi = PF_ESI_ENABLED ? (s.pf_employee || 0) + (s.esi_employee || 0) : 0;
  return pfEsi + (s.professional_tax || 0) + (s.tds || 0);
}

/** Annual CTC implied by a monthly structure: 12 × (gross + employer PF + employer ESI). */
export function annualCtcFromStructure(s: SalaryStructure): number {
  const employer = PF_ESI_ENABLED ? (s.pf_employer || 0) + (s.esi_employer || 0) : 0;
  return Math.round(12 * (monthlyGross(s) + employer));
}

export function suggestedPf(basic: number): number {
  return Math.round(Math.min(basic || 0, EPF_WAGE_CEILING) * EPF_RATE);
}

export function suggestedEsi(gross: number, rate: number): number {
  if (!gross || gross > ESI_GROSS_LIMIT) return 0;
  return Math.ceil(gross * rate); // ESI contributions are rounded up to the next rupee
}

/**
 * Standard Indian CTC breakup from an annual CTC figure:
 *   Basic = 40% of monthly CTC, HRA = 40% of basic,
 *   fixed conveyance (₹1,600) & medical (₹1,250) allowances,
 *   employer PF/ESI carved out of CTC, special allowance balances the rest.
 */
export function splitCtc(annualCtc: number): SalaryStructure {
  const monthlyCtc = (annualCtc || 0) / 12;
  const basic = Math.round(monthlyCtc * 0.4);
  const hra = Math.round(basic * 0.4);
  const conveyance = monthlyCtc > 8000 ? 1600 : 0;
  const medical = monthlyCtc > 10000 ? 1250 : 0;
  const pfEmployer = PF_ESI_ENABLED ? suggestedPf(basic) : 0;

  // Provisional gross to test ESI applicability
  const provisionalGross = monthlyCtc - pfEmployer;
  const esiEmployer = PF_ESI_ENABLED
    ? suggestedEsi(Math.min(provisionalGross, ESI_GROSS_LIMIT + 1), ESI_EMPLOYER_RATE)
    : 0;

  const special = Math.max(
    0,
    Math.round(monthlyCtc - basic - hra - conveyance - medical - pfEmployer - esiEmployer)
  );

  const s: SalaryStructure = {
    basic,
    hra,
    conveyance_allowance: conveyance,
    medical_allowance: medical,
    special_allowance: special,
    other_allowance: 0,
    pf_employee: PF_ESI_ENABLED ? suggestedPf(basic) : 0,
    pf_employer: pfEmployer,
    esi_employee: 0,
    esi_employer: 0,
    professional_tax: 0,
    tds: 0,
  };
  if (PF_ESI_ENABLED) {
    const gross = monthlyGross(s);
    s.esi_employee = suggestedEsi(gross, ESI_EMPLOYEE_RATE);
    s.esi_employer = suggestedEsi(gross, ESI_EMPLOYER_RATE);
  }
  return s;
}

/** Earnings lines for a payslip, prorated for loss-of-pay days. */
export function slipEarnings(s: SalaryStructure, totalDays: number, paidDays: number): SlipLine[] {
  const factor = totalDays > 0 ? paidDays / totalDays : 1;
  const pro = (n: number) => Math.round((n || 0) * factor);
  const lines: SlipLine[] = [
    { label: "Basic", amount: pro(s.basic) },
    { label: "House Rent Allowance", amount: pro(s.hra) },
    { label: "Conveyance Allowance", amount: pro(s.conveyance_allowance) },
    { label: "Medical Allowance", amount: pro(s.medical_allowance) },
    { label: "Special Allowance", amount: pro(s.special_allowance) },
    { label: "Other Allowance", amount: pro(s.other_allowance) },
  ];
  return lines.filter((l) => l.amount > 0 || l.label === "Basic");
}

/** Deduction lines for a payslip. PF/ESI recomputed on prorated amounts. */
export function slipDeductions(s: SalaryStructure, totalDays: number, paidDays: number): SlipLine[] {
  const factor = totalDays > 0 ? paidDays / totalDays : 1;
  const proBasic = Math.round((s.basic || 0) * factor);
  const proGross = Math.round(monthlyGross(s) * factor);
  const lines: SlipLine[] = [
    { label: "Provident Fund", amount: PF_ESI_ENABLED && s.pf_employee ? suggestedPf(proBasic) : 0 },
    { label: "ESI", amount: PF_ESI_ENABLED && s.esi_employee ? suggestedEsi(proGross, ESI_EMPLOYEE_RATE) : 0 },
    { label: "Professional Tax", amount: s.professional_tax || 0 },
    { label: "Income Tax (TDS)", amount: s.tds || 0 },
  ];
  return lines.filter((l) => l.amount > 0);
}

export function daysInMonth(month: string): number {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08" → "August 2026" */
export function formatMonth(month: string): string {
  const [y, m] = (month || "").split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month || "";
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
