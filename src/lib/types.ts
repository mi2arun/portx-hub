export type BankAccount = {
  id: string;
  label: string;          // free-text display label e.g. "Primary INR"
  currency: string;       // "" = any currency, else "INR" / "USD" / "EUR" / ...
  beneficiary_bank: string;
  /** Full bank-branch address — used on the bank-letter PDF. */
  bank_address?: string;
  beneficiary_account_name: string;
  beneficiary_account_number: string;
  /** Account type ("Current" / "Savings"). Optional. */
  account_type?: string;
  ifsc: string;
  swift_code: string;
  /** International Bank Account Number, where applicable. */
  iban?: string;
  is_primary: boolean;
};

export type Company = {
  id: string;
  name: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  hsn_code: string;
  /** New multi-account shape. Falls back to legacy fields below if empty. */
  bank_accounts?: BankAccount[];
  /** @deprecated use bank_accounts */
  bank_name?: string;
  /** @deprecated use bank_accounts */
  account_name?: string;
  /** @deprecated use bank_accounts */
  account_number?: string;
  /** @deprecated use bank_accounts */
  ifsc?: string;
  /** @deprecated use bank_accounts */
  swift_code?: string;
  logo_path: string;
  email: string;
  phone: string;
  cin: string;
  invoice_prefix: string;
  invoice_next_number: number;
  fy_start_month?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;

  // GST export / LUT (Letter of Undertaking) — required to issue zero-rated
  // export invoices without payment of IGST.
  lut_enabled?: boolean;
  lut_arn?: string;          // e.g. "AD3304260648504"
  lut_valid_from?: string;   // YYYY-MM-DD
  lut_valid_to?: string;     // YYYY-MM-DD
  lut_note?: string;         // override default note text

  // Authorized signatory — printed on bank-letter / certificate PDFs.
  signatory_name?: string;
  signatory_designation?: string;
  signature_url?: string;    // optional uploaded image of signature
  place_of_signing?: string; // e.g. "Coimbatore"
  website?: string;          // optional, footer
};

export const DEFAULT_LUT_NOTE = "EXPORT OF SERVICES WITHOUT PAYMENT OF TAX UNDER LUT";

/** Pick the bank account whose currency matches the invoice currency,
 *  falling back to the primary, then the first available. */
export function pickBankAccount(
  bank_accounts: BankAccount[] | undefined,
  invoiceCurrency: string
): BankAccount | null {
  if (!bank_accounts || bank_accounts.length === 0) return null;
  const cur = (invoiceCurrency || "").toUpperCase();
  return (
    bank_accounts.find((a) => (a.currency || "").toUpperCase() === cur) ||
    bank_accounts.find((a) => a.is_primary) ||
    bank_accounts.find((a) => !a.currency) ||
    bank_accounts[0]
  );
}

export type Client = {
  id: string;
  company_id: string;
  name: string;
  contact_name: string;
  email: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  currency: string;
  is_international: boolean;
};

export type InvoiceItem = {
  description: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  amount: number;
};

export type Invoice = {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client_id: string;
  client_name: string;
  currency: string;
  hsn_code: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: string;
  amount_paid: number;
  items: InvoiceItem[];
  /** Customer's Purchase Order reference (free-form text). Optional. */
  po_reference?: string;
  /** Place of supply printed on invoice (state name for India, country for export). */
  place_of_supply?: string;
  /** Export classification — only meaningful when client is international.
   *  "lut"      — export of services without payment of tax under LUT/Bond
   *  "with_tax" — export with payment of IGST (zero-rated, claim refund)
   *  ""         — domestic invoice
   */
  export_type?: "lut" | "with_tax" | "";
  /** ARN snapshot taken from company.lut_arn at the moment the invoice was created. */
  lut_arn?: string;
  /** Free-form notes printed on the PDF below the totals. */
  notes?: string;
  created_at: string;
  updated_at: string;
};

export const EXPENSE_CATEGORIES = [
  "Cloud Services & Hosting",
  "Software Subscriptions",
  "Office Rent & Utilities",
  "Internet & Telecom",
  "Hardware & Equipment",
  "Travel & Conveyance",
  "Professional Fees",
  "Office Supplies",
  "Food & Beverages",
  "Marketing & Advertising",
  "Training & Courses",
  "Salaries & Stipends",
  "Insurance",
  "Government Fees & Taxes",
  "Miscellaneous",
] as const;

export type Expense = {
  id: string;
  company_id: string;
  date: string;
  amount: number;
  category: string;
  vendor: string;
  description: string;
  payment_mode: string;
  reference: string;
  gst_amount: number;
  vendor_gstin: string;
  is_recurring: boolean;
  created_at: string;
};

export type Payment = {
  id: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  inr_amount?: number;
  payment_date: string;
  payment_mode: string;
  reference: string;
  notes: string;
  created_at: string;
};

export type Document = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  notes: string;
  client_id: string;
  uploaded_at: string;
};
