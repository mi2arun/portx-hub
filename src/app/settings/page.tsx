"use client";

import { useEffect, useState } from "react";
import { Building2, Landmark, Hash, Loader2, Check, CalendarDays } from "lucide-react";

type Company = {
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
  email: string;
  phone: string;
  cin: string;
  invoice_prefix: string;
  invoice_next_number: number;
  fy_start_month: number; // 4 = April (Indian FY)
};

export default function SettingsPage() {
  const [form, setForm] = useState<Company>({
    name: "", address: "", state: "", country: "", gstin: "", pan: "", hsn_code: "",
    bank_name: "", account_name: "", account_number: "", ifsc: "", swift_code: "",
    email: "", phone: "", cin: "",
    invoice_prefix: "A", invoice_next_number: 1, fy_start_month: 4,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data) => { if (data) setForm(data); });
  }, []);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your company information and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Top row: Company Info + Bank Details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <Building2 className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-900">Company Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Company Name</label>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <textarea value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>State</label>
                  <input value={form.state} onChange={(e) => update("state", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input value={form.country} onChange={(e) => update("country", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input value={form.gstin} onChange={(e) => update("gstin", e.target.value)} className={inputClass} placeholder="e.g., 33AAJCP9411B1ZM" />
                </div>
                <div>
                  <label className={labelClass}>PAN</label>
                  <input value={form.pan} onChange={(e) => update("pan", e.target.value)} className={inputClass} placeholder="e.g., AAJCP9411B" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} placeholder="e.g., info@portx.in" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} placeholder="e.g., +91 98765 43210" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>CIN</label>
                  <input value={form.cin} onChange={(e) => update("cin", e.target.value)} className={inputClass} placeholder="Company Identification Number" />
                </div>
                <div>
                  <label className={labelClass}>HSN / SAC Code</label>
                  <input value={form.hsn_code} onChange={(e) => update("hsn_code", e.target.value)} className={inputClass} placeholder="e.g., 998314" />
                  <p className="text-xs text-gray-400 mt-1">Default code on invoices</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <Landmark className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-900">Bank Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Account Name</label>
                <input value={form.account_name} onChange={(e) => update("account_name", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input value={form.account_number} onChange={(e) => update("account_number", e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input value={form.ifsc} onChange={(e) => update("ifsc", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>SWIFT Code</label>
                  <input value={form.swift_code} onChange={(e) => update("swift_code", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Invoice Numbering + Financial Year */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Numbering */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <Hash className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-900">Invoice Numbering</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prefix</label>
                  <input value={form.invoice_prefix} onChange={(e) => update("invoice_prefix", e.target.value)} placeholder="A" className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">e.g., A, INV, PI</p>
                </div>
                <div>
                  <label className={labelClass}>Next Number</label>
                  <input type="number" min="1" value={form.invoice_next_number}
                    onChange={(e) => update("invoice_next_number", Math.max(1, Number(e.target.value)))} className={inputClass} />
                </div>
              </div>
              <div className="bg-violet-50 rounded-lg px-4 py-3 text-sm">
                Next invoice: <span className="font-mono font-semibold text-violet-700">{form.invoice_prefix}{String(form.invoice_next_number).padStart(5, "0")}</span>
              </div>
            </div>
          </div>

          {/* Financial Year */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <CalendarDays className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-900">Financial Year</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>FY Start Month</label>
                <select value={form.fy_start_month}
                  onChange={(e) => update("fy_start_month", Number(e.target.value))}
                  className={inputClass}>
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April (India Standard)</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Used for date filters and reports</p>
              </div>
              <div className="bg-violet-50 rounded-lg px-4 py-3 text-sm">
                {(() => {
                  const m = form.fy_start_month || 4;
                  const now = new Date();
                  const year = now.getMonth() + 1 >= m ? now.getFullYear() : now.getFullYear() - 1;
                  const endYear = m === 1 ? year : year + 1;
                  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  const endMonth = m === 1 ? 12 : m - 1;
                  return <>Current FY: <span className="font-semibold text-violet-700">{months[m-1]} {year} — {months[endMonth-1]} {endYear}</span></>;
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
