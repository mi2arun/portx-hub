"use client";

import { useEffect, useState, createElement } from "react";
import {
  Plus, X, Loader2, Download, Trash2, FileText, Banknote,
} from "lucide-react";
import { Employee, SalarySlip, SlipLine } from "@/lib/types";
import {
  slipEarnings, slipDeductions, daysInMonth, formatMonth,
} from "@/lib/payroll";

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
];

const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500";
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

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

type LineEditorProps = {
  title: string;
  lines: SlipLine[];
  onChange: (lines: SlipLine[]) => void;
};

function LineEditor({ title, lines, onChange }: LineEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <button type="button"
          onClick={() => onChange([...lines, { label: "", amount: 0 }])}
          className="text-xs text-violet-600 hover:text-violet-800 font-medium">
          + Add line
        </button>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={line.label}
              onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
              placeholder="Label" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500" />
            <input type="number" min="0" value={line.amount || ""}
              onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, amount: Number(e.target.value) || 0 } : l)))}
              className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:ring-violet-500 focus:border-violet-500" />
            <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {lines.length === 0 && <p className="text-xs text-gray-400 py-1">No lines</p>}
      </div>
    </div>
  );
}

export default function EmployeePayslips({ employee }: { employee: Employee }) {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  const [month, setMonth] = useState(currentMonth());
  const [lopDays, setLopDays] = useState(0);
  const [earnings, setEarnings] = useState<SlipLine[]>([]);
  const [deductions, setDeductions] = useState<SlipLine[]>([]);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");

  function loadSlips() {
    fetch(`/api/employees/${employee.id}/salary-slips`)
      .then((r) => r.json())
      .then((data) => { setSlips(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(loadSlips, [employee.id]);

  const totalDays = daysInMonth(month);
  const paidDays = Math.max(0, totalDays - lopDays);

  // Recompute prefilled lines whenever month or LOP changes (while modal open)
  useEffect(() => {
    if (!showModal) return;
    setEarnings(slipEarnings(employee.salary, totalDays, paidDays));
    setDeductions(slipDeductions(employee.salary, totalDays, paidDays));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, month, lopDays]);

  function openModal() {
    setMonth(currentMonth());
    setLopDays(0);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("bank_transfer");
    setError("");
    setShowModal(true);
  }

  const gross = earnings.reduce((s, l) => s + (l.amount || 0), 0);
  const totalDeductions = deductions.reduce((s, l) => s + (l.amount || 0), 0);
  const netPay = gross - totalDeductions;

  async function handleGenerate() {
    setError("");
    if (!month) { setError("Month is required"); return; }
    if (earnings.filter((l) => l.label).length === 0) { setError("Add at least one earning line"); return; }
    setSaving(true);
    const res = await fetch(`/api/employees/${employee.id}/salary-slips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month, total_days: totalDays, paid_days: paidDays, lop_days: lopDays,
        earnings, deductions, payment_date: paymentDate, payment_mode: paymentMode,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to generate payslip");
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowModal(false);
    loadSlips();
  }

  async function handleDownload(slip: SalarySlip) {
    setDownloadingId(slip.id);
    try {
      const company = await fetch("/api/settings").then((r) => r.json());
      const logoSrc = await fetchAsDataUrl(company.logo_path || "/portx-logo.png");
      const { pdf } = await import("@react-pdf/renderer");
      const { default: SalarySlipPDF } = await import("@/components/SalarySlipPDF");
      const doc = createElement(SalarySlipPDF, { company, employee, slip, logoSrc });
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip-${(employee.name || "Employee").replace(/[^a-z0-9]+/gi, "-")}-${slip.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Payslip PDF generation failed:", e);
      alert("Failed to generate PDF. Please try again.");
    }
    setDownloadingId("");
  }

  async function handleDelete(slip: SalarySlip) {
    if (!confirm(`Delete payslip for ${formatMonth(slip.month)}?`)) return;
    await fetch(`/api/salary-slips/${slip.id}`, { method: "DELETE" });
    loadSlips();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {slips.length} payslip{slips.length === 1 ? "" : "s"} generated
        </p>
        <button onClick={openModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm">
          <Plus className="w-4 h-4" /> Generate Payslip
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
      ) : slips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Banknote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No payslips yet. Generate the first one from the salary structure.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {slips.map((slip) => (
            <div key={slip.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatMonth(slip.month)}</p>
                  <p className="text-xs text-gray-400">
                    Paid days {slip.paid_days}/{slip.total_days}
                    {slip.lop_days ? ` · LOP ${slip.lop_days}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900">{inr(slip.net_pay)}</p>
                  <p className="text-xs text-gray-400">
                    Gross {inr(slip.gross_earnings)} − Ded. {inr(slip.total_deductions)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownload(slip)} disabled={downloadingId === slip.id}
                    className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-50" title="Download PDF">
                    {downloadingId === slip.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Download className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(slip)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Generate Payslip — {employee.name}</h3>
              <button onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Month *</label>
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">LOP Days</label>
                  <input type="number" min="0" max={totalDays} value={lopDays || ""}
                    onChange={(e) => setLopDays(Math.min(totalDays, Number(e.target.value) || 0))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date</label>
                  <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
                    {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                {totalDays} days in {formatMonth(month)} · {paidDays} paid days. Earnings are prorated for LOP; edit any line before generating.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <LineEditor title="Earnings" lines={earnings} onChange={setEarnings} />
                <LineEditor title="Deductions" lines={deductions} onChange={setDeductions} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Gross Earnings", value: inr(gross) },
                  { label: "Total Deductions", value: inr(totalDeductions) },
                  { label: "Net Pay", value: inr(netPay) },
                ].map((t) => (
                  <div key={t.label} className="bg-violet-50/60 rounded-lg px-4 py-3">
                    <p className="text-[11px] text-gray-500">{t.label}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{t.value}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={handleGenerate} disabled={saving}
                  className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? "Generating..." : "Generate"}
                </button>
                <button onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
