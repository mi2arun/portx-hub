"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Wand2 } from "lucide-react";
import {
  Employee, SalaryStructure, EMPTY_SALARY_STRUCTURE,
  EMPLOYMENT_TYPES, EMPLOYEE_STATUSES,
} from "@/lib/types";
import {
  splitCtc, monthlyGross, monthlyDeductions, annualCtcFromStructure,
  suggestedPf, suggestedEsi, ESI_EMPLOYEE_RATE, ESI_EMPLOYER_RATE,
  PF_ESI_ENABLED,
} from "@/lib/payroll";

type FormState = Omit<Employee, "id" | "company_id" | "created_at" | "updated_at">;

const emptyForm: FormState = {
  employee_code: "", name: "", email: "", phone: "",
  designation: "", department: "", employment_type: "full_time", status: "active",
  date_of_joining: "", date_of_leaving: "", dob: "", gender: "",
  address: "", work_location: "",
  pan: "", aadhaar: "", uan: "", pf_number: "", esi_number: "",
  bank_name: "", bank_account_number: "", bank_ifsc: "",
  annual_ctc: 0, salary: { ...EMPTY_SALARY_STRUCTURE },
  offer_date: "", offer_valid_until: "",
  probation_months: 3, notice_period_days: 30,
};

const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function EmployeeForm({ employee }: { employee?: Employee }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    employee
      ? { ...emptyForm, ...employee, salary: { ...EMPTY_SALARY_STRUCTURE, ...employee.salary } }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof FormState) => (value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setSal = (field: keyof SalaryStructure) => (value: string) =>
    setForm((f) => ({ ...f, salary: { ...f.salary, [field]: Number(value) || 0 } }));

  function autoSplit() {
    if (!form.annual_ctc || form.annual_ctc <= 0) {
      setError("Enter an Annual CTC first, then auto-split");
      return;
    }
    setError("");
    setForm((f) => ({ ...f, salary: splitCtc(f.annual_ctc) }));
  }

  function autoStatutory() {
    setForm((f) => {
      const gross = monthlyGross(f.salary);
      const pf = suggestedPf(f.salary.basic);
      return {
        ...f,
        salary: {
          ...f.salary,
          pf_employee: pf,
          pf_employer: pf,
          esi_employee: suggestedEsi(gross, ESI_EMPLOYEE_RATE),
          esi_employer: suggestedEsi(gross, ESI_EMPLOYER_RATE),
        },
      };
    });
  }

  async function handleSubmit() {
    setError("");
    if (!form.name) { setError("Name is required"); return; }
    if (!form.designation) { setError("Designation is required"); return; }
    setSaving(true);
    const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
    const method = employee ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to save employee");
      setSaving(false);
      return;
    }
    const saved = await res.json();
    router.push(`/employees/${saved.id}`);
  }

  const gross = monthlyGross(form.salary);
  const deductions = monthlyDeductions(form.salary);
  const impliedCtc = annualCtcFromStructure(form.salary);

  const salaryEarnings: { key: keyof SalaryStructure; label: string }[] = [
    { key: "basic", label: "Basic" },
    { key: "hra", label: "HRA" },
    { key: "conveyance_allowance", label: "Conveyance Allowance" },
    { key: "medical_allowance", label: "Medical Allowance" },
    { key: "special_allowance", label: "Special Allowance" },
    { key: "other_allowance", label: "Other Allowance" },
  ];
  const salaryDeductions: { key: keyof SalaryStructure; label: string; hint?: string }[] = [
    ...(PF_ESI_ENABLED ? [
      { key: "pf_employee" as const, label: "PF — Employee", hint: "12% of basic (ceiling ₹15,000)" },
      { key: "pf_employer" as const, label: "PF — Employer (CTC)", hint: "not deducted from gross" },
      { key: "esi_employee" as const, label: "ESI — Employee", hint: "0.75% if gross ≤ ₹21,000" },
      { key: "esi_employer" as const, label: "ESI — Employer (CTC)", hint: "3.25% if gross ≤ ₹21,000" },
    ] : []),
    { key: "professional_tax", label: "Professional Tax", hint: "state-specific slab" },
    { key: "tds", label: "Income Tax (TDS)" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Section title="Personal Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g., Priya Sharma" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Employee Code</label>
            <input value={form.employee_code} onChange={(e) => set("employee_code")(e.target.value)}
              placeholder="e.g., PIPL-001" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input type="date" value={form.dob} onChange={(e) => set("dob")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select value={form.gender} onChange={(e) => set("gender")(e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Address</label>
            <textarea value={form.address} rows={2} onChange={(e) => set("address")(e.target.value)}
              placeholder="Residential address (printed on the offer letter)" className={inputClass} />
          </div>
        </div>
      </Section>

      <Section title="Employment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Designation *</label>
            <input value={form.designation} onChange={(e) => set("designation")(e.target.value)}
              placeholder="e.g., Software Engineer" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input value={form.department} onChange={(e) => set("department")(e.target.value)}
              placeholder="e.g., Engineering" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Employment Type</label>
            <select value={form.employment_type} onChange={(e) => set("employment_type")(e.target.value)} className={inputClass}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={(e) => set("status")(e.target.value)} className={inputClass}>
              {EMPLOYEE_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Joining</label>
            <input type="date" value={form.date_of_joining} onChange={(e) => set("date_of_joining")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Work Location</label>
            <input value={form.work_location} onChange={(e) => set("work_location")(e.target.value)}
              placeholder="e.g., Coimbatore / Remote" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Probation (months)</label>
            <input type="number" min="0" value={form.probation_months || ""}
              onChange={(e) => set("probation_months")(Number(e.target.value) || 0)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notice Period (days)</label>
            <input type="number" min="0" value={form.notice_period_days || ""}
              onChange={(e) => set("notice_period_days")(Number(e.target.value) || 0)} className={inputClass} />
          </div>
          {(form.status === "resigned" || form.status === "terminated") && (
            <div>
              <label className={labelClass}>Date of Leaving</label>
              <input type="date" value={form.date_of_leaving} onChange={(e) => set("date_of_leaving")(e.target.value)} className={inputClass} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Statutory IDs" subtitle="Printed on payslips; leave blank if not applicable">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>PAN</label>
            <input value={form.pan} onChange={(e) => set("pan")(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F" className={inputClass} maxLength={10} />
          </div>
          <div>
            <label className={labelClass}>Aadhaar</label>
            <input value={form.aadhaar} onChange={(e) => set("aadhaar")(e.target.value.replace(/\D/g, ""))}
              placeholder="12-digit number" className={inputClass} maxLength={12} />
          </div>
          <div>
            <label className={labelClass}>UAN (PF)</label>
            <input value={form.uan} onChange={(e) => set("uan")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PF Number</label>
            <input value={form.pf_number} onChange={(e) => set("pf_number")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ESI Number</label>
            <input value={form.esi_number} onChange={(e) => set("esi_number")(e.target.value)} className={inputClass} />
          </div>
        </div>
      </Section>

      <Section title="Salary Bank Account">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Bank Name</label>
            <input value={form.bank_name} onChange={(e) => set("bank_name")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <input value={form.bank_account_number} onChange={(e) => set("bank_account_number")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>IFSC</label>
            <input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc")(e.target.value.toUpperCase())} className={inputClass} maxLength={11} />
          </div>
        </div>
      </Section>

      <Section title="Compensation" subtitle="All salary components are monthly figures in INR">
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div className="w-52">
            <label className={labelClass}>Annual CTC (₹)</label>
            <input type="number" min="0" value={form.annual_ctc || ""}
              onChange={(e) => set("annual_ctc")(Number(e.target.value) || 0)}
              placeholder="e.g., 600000" className={inputClass} />
          </div>
          <button type="button" onClick={autoSplit}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-violet-200 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50">
            <Wand2 className="w-3.5 h-3.5" /> Auto-split from CTC
          </button>
          {PF_ESI_ENABLED && (
            <button type="button" onClick={autoStatutory}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              title="Recalculate PF (12% of basic, ₹15,000 ceiling) and ESI (if gross ≤ ₹21,000)">
              Recalculate PF / ESI
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Earnings (monthly)</p>
            <div className="space-y-3">
              {salaryEarnings.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 flex-1">{label}</label>
                  <input type="number" min="0" value={form.salary[key] || ""}
                    onChange={(e) => setSal(key)(e.target.value)}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-violet-500 focus:border-violet-500" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Deductions &amp; employer contributions (monthly)</p>
            <div className="space-y-3">
              {salaryDeductions.map(({ key, label, hint }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600">{label}</label>
                    {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
                  </div>
                  <input type="number" min="0" value={form.salary[key] || ""}
                    onChange={(e) => setSal(key)(e.target.value)}
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-violet-500 focus:border-violet-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live summary */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Monthly Gross", value: inr(gross) },
            { label: "Monthly Deductions", value: inr(deductions) },
            { label: "Net Pay / month", value: inr(gross - deductions) },
            { label: "Implied Annual CTC", value: inr(impliedCtc) },
          ].map((t) => (
            <div key={t.label} className="bg-violet-50/60 rounded-lg px-4 py-3">
              <p className="text-[11px] text-gray-500">{t.label}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{t.value}</p>
            </div>
          ))}
        </div>
        {form.annual_ctc > 0 && Math.abs(impliedCtc - form.annual_ctc) > 12 && (
          <p className="text-xs text-amber-600 mt-2">
            Structure implies {inr(impliedCtc)} CTC vs the entered {inr(form.annual_ctc)} — adjust components or use auto-split.
          </p>
        )}
      </Section>

      <Section title="Offer Details" subtitle="Used on the generated offer letter">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Offer Date</label>
            <input type="date" value={form.offer_date} onChange={(e) => set("offer_date")(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Offer Valid Until</label>
            <input type="date" value={form.offer_valid_until} onChange={(e) => set("offer_valid_until")(e.target.value)} className={inputClass} />
          </div>
        </div>
      </Section>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : employee ? "Save Changes" : "Add Employee"}
        </button>
        <button onClick={() => router.back()} disabled={saving}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
