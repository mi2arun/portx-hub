"use client";

import { use, useEffect, useState, createElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2, Loader2, FileDown,
  Briefcase, User, Landmark, ShieldCheck, IndianRupee,
} from "lucide-react";
import { Employee, EMPLOYEE_STATUSES } from "@/lib/types";
import { monthlyGross, monthlyDeductions, annualCtcFromStructure, PF_ESI_ENABLED } from "@/lib/payroll";
import { TableSkeleton } from "@/components/Skeleton";
import EmployeePayslips from "@/components/EmployeePayslips";
import EmployeeDocuments from "@/components/EmployeeDocuments";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  offered: "bg-amber-50 text-amber-600",
  resigned: "bg-gray-100 text-gray-500",
  terminated: "bg-red-50 text-red-600",
};

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function InfoCard({ title, icon: Icon, items }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; value: string }[];
}) {
  const visible = items.filter((i) => i.value);
  if (visible.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-violet-500" /> {title}
      </h3>
      <dl className="space-y-2.5">
        {visible.map((i) => (
          <div key={i.label} className="flex justify-between gap-4 text-sm">
            <dt className="text-gray-400 shrink-0">{i.label}</dt>
            <dd className="text-gray-900 font-medium text-right">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const TABS = ["Overview", "Payslips", "Documents"] as const;

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [offerBusy, setOfferBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setEmployee(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!employee) return;
    if (!confirm(`Delete ${employee.name}? This also removes their payslips and cannot be undone.`)) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.push("/employees");
  }

  async function handleOfferLetter() {
    if (!employee) return;
    setOfferBusy(true);
    try {
      const company = await fetch("/api/settings").then((r) => r.json());
      const [logoSrc, signatureSrc] = await Promise.all([
        fetchAsDataUrl(company.logo_path || "/portx-logo.png"),
        fetchAsDataUrl(company.signature_url || ""),
      ]);
      const { pdf } = await import("@react-pdf/renderer");
      const { default: OfferLetterPDF } = await import("@/components/OfferLetterPDF");
      const issueDate = employee.offer_date || new Date().toISOString().split("T")[0];
      const doc = createElement(OfferLetterPDF, { company, employee, issueDate, logoSrc, signatureSrc });
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Offer-Letter-${employee.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Offer letter generation failed:", e);
      alert("Failed to generate offer letter. Please try again.");
    }
    setOfferBusy(false);
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={3} />;
  }
  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Employee not found.</p>
        <Link href="/employees" className="text-violet-600 text-sm font-medium hover:underline">← Back to Employees</Link>
      </div>
    );
  }

  const sal = employee.salary;
  const gross = monthlyGross(sal);
  const deductions = monthlyDeductions(sal);
  const statusLabel = EMPLOYEE_STATUSES.find((st) => st.value === employee.status)?.label || employee.status;

  const salaryRows = [
    { label: "Basic", value: sal.basic },
    { label: "HRA", value: sal.hra },
    { label: "Conveyance Allowance", value: sal.conveyance_allowance },
    { label: "Medical Allowance", value: sal.medical_allowance },
    { label: "Special Allowance", value: sal.special_allowance },
    { label: "Other Allowance", value: sal.other_allowance },
  ].filter((r) => r.value > 0);

  const deductionRows = [
    ...(PF_ESI_ENABLED ? [
      { label: "PF (Employee)", value: sal.pf_employee },
      { label: "ESI (Employee)", value: sal.esi_employee },
    ] : []),
    { label: "Professional Tax", value: sal.professional_tax },
    { label: "Income Tax (TDS)", value: sal.tds },
  ].filter((r) => r.value > 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4" /> Employees
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${statusStyles[employee.status] || "bg-gray-100 text-gray-500"}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {[employee.employee_code, employee.designation, employee.department].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleOfferLetter} disabled={offerBusy}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-violet-200 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50 disabled:opacity-50">
              {offerBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              {offerBusy ? "Generating..." : "Offer Letter"}
            </button>
            <Link href={`/employees/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Annual CTC", value: employee.annual_ctc ? inr(employee.annual_ctc) : inr(annualCtcFromStructure(sal)) },
              { label: "Monthly Gross", value: inr(gross) },
              { label: "Monthly Deductions", value: inr(deductions) },
              { label: "Net Pay / month", value: inr(gross - deductions) },
            ].map((t) => (
              <div key={t.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5">
                <p className="text-[11px] text-gray-400">{t.label}</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{t.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoCard title="Employment" icon={Briefcase} items={[
              { label: "Designation", value: employee.designation },
              { label: "Department", value: employee.department },
              { label: "Type", value: employee.employment_type?.replace(/_/g, " ") },
              { label: "Date of Joining", value: employee.date_of_joining },
              { label: "Date of Leaving", value: employee.date_of_leaving },
              { label: "Work Location", value: employee.work_location },
              { label: "Probation", value: employee.probation_months ? `${employee.probation_months} months` : "" },
              { label: "Notice Period", value: employee.notice_period_days ? `${employee.notice_period_days} days` : "" },
            ]} />
            <InfoCard title="Personal" icon={User} items={[
              { label: "Email", value: employee.email },
              { label: "Phone", value: employee.phone },
              { label: "Date of Birth", value: employee.dob },
              { label: "Gender", value: employee.gender },
              { label: "Address", value: employee.address },
            ]} />
            <InfoCard title="Statutory IDs" icon={ShieldCheck} items={[
              { label: "PAN", value: employee.pan },
              { label: "Aadhaar", value: employee.aadhaar ? "XXXX XXXX " + employee.aadhaar.slice(-4) : "" },
              ...(PF_ESI_ENABLED ? [
                { label: "UAN", value: employee.uan },
                { label: "PF Number", value: employee.pf_number },
                { label: "ESI Number", value: employee.esi_number },
              ] : []),
            ]} />
            <InfoCard title="Salary Bank Account" icon={Landmark} items={[
              { label: "Bank", value: employee.bank_name },
              { label: "Account No.", value: employee.bank_account_number },
              { label: "IFSC", value: employee.bank_ifsc },
            ]} />
          </div>

          {/* Salary structure */}
          {(salaryRows.length > 0 || deductionRows.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <IndianRupee className="w-4 h-4 text-violet-500" /> Salary Structure (monthly)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Earnings</p>
                  <dl className="space-y-2 text-sm">
                    {salaryRows.map((r) => (
                      <div key={r.label} className="flex justify-between">
                        <dt className="text-gray-500">{r.label}</dt>
                        <dd className="font-medium text-gray-900">{inr(r.value)}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                      <dt className="text-gray-700">Gross</dt>
                      <dd className="text-gray-900">{inr(gross)}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Deductions</p>
                  <dl className="space-y-2 text-sm">
                    {deductionRows.map((r) => (
                      <div key={r.label} className="flex justify-between">
                        <dt className="text-gray-500">{r.label}</dt>
                        <dd className="font-medium text-gray-900">{inr(r.value)}</dd>
                      </div>
                    ))}
                    {PF_ESI_ENABLED && (sal.pf_employer > 0 || sal.esi_employer > 0) && (
                      <>
                        {sal.pf_employer > 0 && (
                          <div className="flex justify-between text-gray-400">
                            <dt>PF — Employer (CTC)</dt>
                            <dd>{inr(sal.pf_employer)}</dd>
                          </div>
                        )}
                        {sal.esi_employer > 0 && (
                          <div className="flex justify-between text-gray-400">
                            <dt>ESI — Employer (CTC)</dt>
                            <dd>{inr(sal.esi_employer)}</dd>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                      <dt className="text-gray-700">Net Pay</dt>
                      <dd className="text-gray-900">{inr(gross - deductions)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Payslips" && <EmployeePayslips employee={employee} />}
      {tab === "Documents" && <EmployeeDocuments employeeId={id} />}
    </div>
  );
}
