"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Landmark, Hash, Loader2, Check, CalendarDays, Mail, Plus, Trash2, Briefcase, Image as ImageIcon, Upload, X, FileBadge, PenTool } from "lucide-react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { clientStorage } from "@/lib/firebase-client";
import BankLetterButton from "@/components/BankLetterButton";
import { SettingsSkeleton } from "@/components/Skeleton";

type BankAccount = {
  id: string;
  label: string;
  currency: string;
  beneficiary_bank: string;
  bank_address: string;
  beneficiary_account_name: string;
  beneficiary_account_number: string;
  account_type: string;
  ifsc: string;
  swift_code: string;
  iban: string;
  is_primary: boolean;
};

type Company = {
  logo_path: string;
  name: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  hsn_code: string;
  bank_accounts: BankAccount[];
  email: string;
  phone: string;
  cin: string;
  invoice_prefix: string;
  invoice_next_number: number;
  fy_start_month: number; // 4 = April (Indian FY)
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  lut_enabled: boolean;
  lut_arn: string;
  lut_valid_from: string;
  lut_valid_to: string;
  lut_note: string;
  signatory_name: string;
  signatory_designation: string;
  signature_url: string;
  place_of_signing: string;
  website: string;
};

function newBankId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function emptyBankAccount(isPrimary = false): BankAccount {
  return {
    id: newBankId(),
    label: "",
    currency: "",
    beneficiary_bank: "",
    bank_address: "",
    beneficiary_account_name: "",
    beneficiary_account_number: "",
    account_type: "",
    ifsc: "",
    swift_code: "",
    iban: "",
    is_primary: isPrimary,
  };
}

type CompanyListItem = { id: string; name: string; gstin?: string; invoice_prefix?: string };

const DEFAULT_COMPANY: Company = {
  logo_path: "/portx-logo.png",
  name: "", address: "", state: "", country: "", gstin: "", pan: "", hsn_code: "",
  bank_accounts: [],
  email: "", phone: "", cin: "",
  invoice_prefix: "A", invoice_next_number: 1, fy_start_month: 4,
  smtp_host: "", smtp_port: 587, smtp_user: "", smtp_password: "",
  smtp_from_email: "", smtp_from_name: "",
  lut_enabled: false, lut_arn: "", lut_valid_from: "", lut_valid_to: "", lut_note: "",
  signatory_name: "", signatory_designation: "", signature_url: "", place_of_signing: "", website: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState<Company>(DEFAULT_COMPANY);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoError, setLogoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyPrefix, setNewCompanyPrefix] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()).catch(() => null),
      fetch("/api/companies").then((r) => r.json()).catch(() => []),
    ]).then(([data, list]) => {
      if (data) {
        // Spread DEFAULTS first so any field missing from the doc stays defined
        // (otherwise controlled inputs flip to uncontrolled).
        setForm({
          ...DEFAULT_COMPANY,
          ...data,
          bank_accounts: Array.isArray(data.bank_accounts) ? data.bank_accounts : [],
          lut_enabled: !!data.lut_enabled,
        });
        setActiveId(data.id || null);
      }
      if (Array.isArray(list)) setCompanies(list);
      setLoading(false);
    });
  }, []);

  function updateBank(id: string, field: keyof BankAccount, value: string | boolean) {
    setForm((f) => ({
      ...f,
      bank_accounts: f.bank_accounts.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
    setSaved(false);
  }
  function addBankAccount() {
    setForm((f) => ({
      ...f,
      bank_accounts: [...f.bank_accounts, emptyBankAccount(f.bank_accounts.length === 0)],
    }));
    setSaved(false);
  }
  function removeBankAccount(id: string) {
    setForm((f) => {
      const next = f.bank_accounts.filter((a) => a.id !== id);
      // Ensure at most one primary; if we removed the primary, promote the first remaining
      if (!next.some((a) => a.is_primary) && next.length > 0) next[0].is_primary = true;
      return { ...f, bank_accounts: next };
    });
    setSaved(false);
  }
  function setPrimaryBank(id: string) {
    setForm((f) => ({
      ...f,
      bank_accounts: f.bank_accounts.map((a) => ({ ...a, is_primary: a.id === id })),
    }));
    setSaved(false);
  }

  function loadCompanies() {
    fetch("/api/companies").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCompanies(data);
    });
  }

  async function addCompany() {
    if (!newCompanyName.trim()) return;
    setAddingCompany(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCompanyName.trim(),
        invoice_prefix: newCompanyPrefix.trim() || "A",
        country: "India",
      }),
    });
    setAddingCompany(false);
    if (res.ok) {
      setNewCompanyName("");
      setNewCompanyPrefix("");
      setShowAddCompany(false);
      loadCompanies();
    }
  }

  async function handleLogoFile(file: File) {
    setLogoError("");
    if (!file.type.startsWith("image/")) {
      setLogoError("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be under 2 MB");
      return;
    }
    if (!activeId) {
      setLogoError("No active company");
      return;
    }
    setUploadingLogo(true);
    setLogoUploadProgress(0);
    const path = `logos/${activeId}/${Date.now()}_${file.name}`;
    const ref = storageRef(clientStorage, path);
    const task = uploadBytesResumable(ref, file);
    task.on(
      "state_changed",
      (snap) => {
        setLogoUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        console.error("Logo upload failed:", err);
        setLogoError("Upload failed. Try again.");
        setUploadingLogo(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, logo_path: url }),
        });
        if (res.ok) {
          setForm((f) => ({ ...f, logo_path: url }));
        } else {
          setLogoError("Saved upload but failed to update settings.");
        }
        setUploadingLogo(false);
        setLogoUploadProgress(0);
      }
    );
  }

  async function resetLogo(builtin: string) {
    setLogoError("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, logo_path: builtin }),
    });
    if (res.ok) setForm((f) => ({ ...f, logo_path: builtin }));
  }

  async function deleteCompany(id: string) {
    setDeleteError("");
    if (!confirm("Delete this company? This is only allowed if it has no data.")) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete");
      return;
    }
    loadCompanies();
  }

  function update(field: string, value: string | number | boolean) {
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

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your company information and preferences</p>
      </div>

      {/* Companies management */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900">Companies</h2>
            <span className="text-xs text-gray-500">({companies.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCompany((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Company
          </button>
        </div>
        {showAddCompany && (
          <div className="px-6 py-4 border-b border-gray-100 bg-violet-50/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className={labelClass}>Company Name</label>
                <input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Acme Pvt Ltd"
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Invoice Prefix</label>
                <input
                  value={newCompanyPrefix}
                  onChange={(e) => setNewCompanyPrefix(e.target.value)}
                  className={inputClass}
                  placeholder="A"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={addCompany}
                disabled={addingCompany || !newCompanyName.trim()}
                className="px-4 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {addingCompany && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => { setShowAddCompany(false); setNewCompanyName(""); setNewCompanyPrefix(""); }}
                className="px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {companies.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div key={c.id} className="flex items-center gap-3 px-6 py-3">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 truncate">{c.name}</span>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.gstin && <span>GSTIN: {c.gstin} · </span>}
                    Prefix: <span className="font-mono">{c.invoice_prefix || "A"}</span>
                  </div>
                </div>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => deleteCompany(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {deleteError && (
          <div className="px-6 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700">{deleteError}</div>
        )}
        <div className="px-6 py-2 bg-gray-50/50 text-[11px] text-gray-500 border-t border-gray-100">
          Edit details for the active company below. Switch companies from the navbar.
        </div>
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
              {/* Logo */}
              <div>
                <label className={labelClass}>Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-20 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.logo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logo_path} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoFile(f);
                        if (e.target) e.target.value = "";
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                      >
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {logoUploadProgress}%
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            Upload logo
                          </>
                        )}
                      </button>
                      {form.logo_path && (
                        <button
                          type="button"
                          onClick={() => resetLogo("")}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remove logo"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">PNG/JPG, max 2 MB. Used in PDFs and invoices.</p>
                    {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
                  </div>
                </div>
              </div>

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

          {/* Bank Accounts (multi, optionally currency-tagged) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-gray-900">Bank Accounts</h2>
                <span className="text-xs text-gray-500">({form.bank_accounts.length})</span>
              </div>
              <button
                type="button"
                onClick={addBankAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add account
              </button>
            </div>
            <div className="p-6 space-y-4">
              {form.bank_accounts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No bank accounts yet. Add one to show it on invoices.
                </p>
              )}
              {form.bank_accounts.map((acc, idx) => (
                <div
                  key={acc.id}
                  className={`rounded-lg border p-4 space-y-3 ${
                    acc.is_primary ? "border-violet-200 bg-violet-50/30" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                      {acc.is_primary ? (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded">Primary</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrimaryBank(acc.id)}
                          className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 hover:text-violet-600 px-1.5 py-0.5 rounded hover:bg-violet-50"
                        >
                          Set primary
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBankAccount(acc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Label (optional)</label>
                      <input
                        value={acc.label}
                        onChange={(e) => updateBank(acc.id, "label", e.target.value)}
                        className={inputClass}
                        placeholder="e.g., Primary INR"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Currency (optional)</label>
                      <select
                        value={acc.currency}
                        onChange={(e) => updateBank(acc.id, "currency", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Any currency</option>
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Beneficiary Bank</label>
                    <textarea
                      value={acc.beneficiary_bank}
                      onChange={(e) => updateBank(acc.id, "beneficiary_bank", e.target.value)}
                      rows={2}
                      className={inputClass}
                      placeholder="e.g., ICICI Bank Ltd., Aishwarya Commercial Center, Coimbatore - 641002"
                    />
                    <p className="text-xs text-gray-400 mt-1">Include branch / address here — printed as a single block on the PDF.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Beneficiary Account Name</label>
                    <input
                      value={acc.beneficiary_account_name}
                      onChange={(e) => updateBank(acc.id, "beneficiary_account_name", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className={labelClass}>Beneficiary Account Number</label>
                      <input
                        value={acc.beneficiary_account_number}
                        onChange={(e) => updateBank(acc.id, "beneficiary_account_number", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Account Type</label>
                      <select
                        value={acc.account_type}
                        onChange={(e) => updateBank(acc.id, "account_type", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">—</option>
                        <option value="Current">Current</option>
                        <option value="Savings">Savings</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>IFSC Code</label>
                      <input
                        value={acc.ifsc}
                        onChange={(e) => updateBank(acc.id, "ifsc", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>SWIFT Code</label>
                      <input
                        value={acc.swift_code}
                        onChange={(e) => updateBank(acc.id, "swift_code", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>IBAN <span className="text-gray-400 font-normal">(international only)</span></label>
                    <input
                      value={acc.iban}
                      onChange={(e) => updateBank(acc.id, "iban", e.target.value)}
                      className={inputClass}
                      placeholder='e.g., "Not Applicable to India"'
                    />
                  </div>

                  {/* Bank-letter download */}
                  <BankLetterButton account={acc} />
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Tip: tag an account with a currency (e.g., EUR) and it will be picked automatically for invoices in that currency. Leave blank for a fallback default.
              </p>
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

        {/* LUT (Letter of Undertaking) for export of services */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <FileBadge className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-900">LUT — Letter of Undertaking</h2>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.lut_enabled}
                onChange={(e) => update("lut_enabled", e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Enable
            </label>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">
              When enabled, export-of-services invoices (international clients) can be issued <strong>without payment of IGST</strong> and the standard LUT note + ARN will be printed on the PDF.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className={labelClass}>ARN <span className="text-red-500">*</span></label>
                <input
                  value={form.lut_arn}
                  onChange={(e) => update("lut_arn", e.target.value)}
                  className={inputClass}
                  placeholder="e.g., AD3304260648504"
                  disabled={!form.lut_enabled}
                />
              </div>
              <div>
                <label className={labelClass}>Valid From</label>
                <input
                  type="date"
                  value={form.lut_valid_from}
                  onChange={(e) => update("lut_valid_from", e.target.value)}
                  className={inputClass}
                  disabled={!form.lut_enabled}
                />
              </div>
              <div>
                <label className={labelClass}>Valid To</label>
                <input
                  type="date"
                  value={form.lut_valid_to}
                  onChange={(e) => update("lut_valid_to", e.target.value)}
                  className={inputClass}
                  disabled={!form.lut_enabled}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Note text (printed on PDF)</label>
              <input
                value={form.lut_note}
                onChange={(e) => update("lut_note", e.target.value)}
                className={inputClass}
                placeholder="EXPORT OF SERVICES WITHOUT PAYMENT OF TAX UNDER LUT"
                disabled={!form.lut_enabled}
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to use the default text.</p>
            </div>
            {form.lut_enabled && !form.lut_arn && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠ ARN is required when LUT is enabled — export invoices won&apos;t save without it.
              </div>
            )}
          </div>
        </div>

        {/* Authorized signatory + letterhead */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <PenTool className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900">Authorized Signatory</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">
              Used on the bank-details certificate PDF (vendor onboarding letters) and other official documents.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Signatory Name</label>
                <input
                  value={form.signatory_name}
                  onChange={(e) => update("signatory_name", e.target.value)}
                  className={inputClass}
                  placeholder="e.g., S Arunkumar"
                />
              </div>
              <div>
                <label className={labelClass}>Designation</label>
                <input
                  value={form.signatory_designation}
                  onChange={(e) => update("signatory_designation", e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Executive Director"
                />
              </div>
              <div>
                <label className={labelClass}>Place of Signing</label>
                <input
                  value={form.place_of_signing}
                  onChange={(e) => update("place_of_signing", e.target.value)}
                  className={inputClass}
                  placeholder="e.g., Coimbatore"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Website <span className="text-gray-400 font-normal">(optional, footer)</span></label>
              <input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
                placeholder="e.g., www.flowstacktechnologies.com"
              />
            </div>
            <p className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg p-3">
              Documents are issued electronically with a footer note in place of a handwritten signature. To embed a verifiable PKI digital signature later, upload a DSC (.p12/.pfx) from a licensed CA — ask to enable that flow when ready.
            </p>
          </div>
        </div>

        {/* SMTP / Email Settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <Mail className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900">Email / SMTP Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>SMTP Host</label>
                <input value={form.smtp_host} onChange={(e) => update("smtp_host", e.target.value)} className={inputClass} placeholder="e.g., panel.portx.in" />
              </div>
              <div>
                <label className={labelClass}>SMTP Port</label>
                <input type="number" value={form.smtp_port} onChange={(e) => update("smtp_port", Number(e.target.value))} className={inputClass} placeholder="587" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>SMTP Username</label>
                <input value={form.smtp_user} onChange={(e) => update("smtp_user", e.target.value)} className={inputClass} placeholder="e.g., noreply@portx.in" />
              </div>
              <div>
                <label className={labelClass}>SMTP Password</label>
                <input type="password" value={form.smtp_password} onChange={(e) => update("smtp_password", e.target.value)} className={inputClass} placeholder="••••••••" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>From Email</label>
                <input type="email" value={form.smtp_from_email} onChange={(e) => update("smtp_from_email", e.target.value)} className={inputClass} placeholder="e.g., noreply@portx.in" />
              </div>
              <div>
                <label className={labelClass}>From Name</label>
                <input value={form.smtp_from_name} onChange={(e) => update("smtp_from_name", e.target.value)} className={inputClass} placeholder="e.g., Portx Infotech" />
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
