export type Company = {
  id: string;
  name: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  hsn_code: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  swift_code: string;
  logo_path: string;
  email: string;
  phone: string;
  cin: string;
  invoice_prefix: string;
  invoice_next_number: number;
};

export type Client = {
  id: string;
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
  invoice_id: string;
  amount: number;
  inr_amount?: number;
  payment_date: string;
  payment_mode: string;
  reference: string;
  notes: string;
  created_at: string;
};
