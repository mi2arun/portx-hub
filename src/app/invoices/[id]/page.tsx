"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { numberToWords } from "@/lib/amount-to-words";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import { InvoiceSkeleton } from "@/components/Skeleton";
import {
  ArrowLeft, Pencil, Send, Copy, Printer, Trash2,
  CreditCard, Loader2, FileText, Trash, Mail, X, CheckCircle2,
} from "lucide-react";

type InvoiceData = {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    currency: string;
    hsn_code: string;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    status: string;
    client_id: string;
    client_name: string;
    client_address: string;
    client_state: string;
    client_country: string;
    client_gstin: string;
    client_email: string;
    client_is_international: number;
    amount_paid: number;
  };
  items: { id: string; description: string; quantity: number; rate: number; gst_rate: number; amount: number; }[];
  company: { name: string; address: string; gstin: string; pan: string; hsn_code: string; bank_name: string; account_name: string; account_number: string; ifsc: string; swift_code: string; email?: string; phone?: string; cin?: string; };
  payments: { id: string; amount: number; inr_amount?: number; payment_date: string; payment_mode: string; reference: string; notes: string; }[];
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  sent: { bg: "bg-blue-50", text: "text-blue-600", label: "Sent" },
  partially_paid: { bg: "bg-amber-50", text: "text-amber-600", label: "Partially Paid" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Paid" },
};

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function ViewInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [payment, setPayment] = useState({
    amount: 0, inr_amount: 0, payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "bank_transfer", reference: "", notes: "",
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailForm, setEmailForm] = useState({
    to: "", cc: "", subject: "", message: "",
  });

  function loadData() {
    fetch(`/api/invoices/${id}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => { if (d.invoice) setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }

  useEffect(() => { loadData(); }, [id]);

  async function updateStatus(status: string) {
    if (!confirm(`Mark this invoice as "${status}"?`)) return;
    setUpdating(true);
    await fetch(`/api/invoices/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: data!.invoice.client_id, invoice_date: data!.invoice.invoice_date, due_date: data!.invoice.due_date, items: data!.items, status }),
    });
    loadData(); setUpdating(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/");
  }

  async function handleClone() {
    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: data!.invoice.client_id,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        items: data!.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate, gst_rate: i.gst_rate })),
        status: "draft",
      }),
    });
    const inv = await res.json();
    router.push(`/invoices/${inv.id}`);
  }

  async function handleRecordPayment() {
    setPaymentError("");
    if (payment.amount <= 0) { setPaymentError("Amount must be greater than 0"); return; }
    setPaymentSaving(true);
    const res = await fetch(`/api/invoices/${id}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment),
    });
    if (!res.ok) { const err = await res.json(); setPaymentError(err.error || "Failed"); setPaymentSaving(false); return; }
    setPaymentSaving(false); setShowPaymentForm(false);
    setPayment({ amount: 0, inr_amount: 0, payment_date: new Date().toISOString().split("T")[0], payment_mode: "bank_transfer", reference: "", notes: "" });
    loadData();
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Remove this payment record?")) return;
    await fetch(`/api/invoices/${id}/payments?paymentId=${paymentId}`, { method: "DELETE" });
    loadData();
  }

  function openEmailModal() {
    setEmailForm({
      to: data?.invoice.client_email || "",
      cc: (data?.company as any).email || "",
      subject: `Invoice ${data?.invoice.invoice_number} from ${data?.company.name}`,
      message: "",
    });
    setEmailError("");
    setEmailSent(false);
    setShowEmailModal(true);
  }

  async function handleSendEmail() {
    if (!emailForm.to) { setEmailError("Recipient email is required"); return; }
    setEmailSending(true);
    setEmailError("");

    try {
      // Generate PDF as base64
      const { createElement } = await import("react");
      const { pdf } = await import("@react-pdf/renderer");
      const { default: InvoicePDF } = await import("@/components/InvoicePDF");

      let logoBase64 = "";
      try {
        const logoRes = await fetch("/portx-logo.png");
        const logoBlob = await logoRes.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
      } catch {}

      const doc = createElement(InvoicePDF, {
        invoice: data!.invoice as any,
        items: data!.items as any,
        company: data!.company as any,
        logoSrc: logoBase64,
      });
      const pdfBlob = await pdf(doc as any).toBlob();
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const res = await fetch(`/api/invoices/${id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...emailForm, pdfBase64 }),
      });

      if (!res.ok) {
        const err = await res.json();
        setEmailError(err.error || "Failed to send email");
        setEmailSending(false);
        return;
      }

      setEmailSent(true);
      setEmailSending(false);
      loadData();
      setTimeout(() => setShowEmailModal(false), 2000);
    } catch (err: any) {
      setEmailError(err.message || "Failed to send email");
      setEmailSending(false);
    }
  }

  if (loading) return <InvoiceSkeleton />;
  if (!data?.invoice) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">Invoice not found</p>
        <Link href="/" className="text-violet-600 hover:underline text-sm">Back to invoices</Link>
      </div>
    );
  }

  const { invoice, items, company } = data;
  const cur = invoice.currency;
  const hasCgstSgst = invoice.cgst > 0 || invoice.sgst > 0;
  const hasIgst = invoice.igst > 0;
  const sc = statusConfig[invoice.status] || statusConfig.draft;
  const balance = invoice.total - (invoice.amount_paid || 0);
  const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500";

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4 no-print">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{invoice.client_name} &middot; {invoice.invoice_date}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {invoice.status === "draft" && (
            <>
              <Link href={`/invoices/${invoice.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
              <button onClick={() => updateStatus("sent")} disabled={updating}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Mark Sent
              </button>
            </>
          )}
          {(invoice.status === "sent" || invoice.status === "partially_paid") && (
            <button onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}
          <button onClick={openEmailModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button onClick={handleClone} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Copy className="w-3.5 h-3.5" /> Clone
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <PDFDownloadButton invoice={invoice} items={items} company={company} fileName={`${invoice.invoice_number}.pdf`} />
          {invoice.status === "draft" && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between gap-2 mb-8">
          <div>
            <h2 className="text-xl font-bold text-violet-700">INVOICE</h2>
            <p className="text-gray-500 text-sm">{invoice.invoice_number}</p>
          </div>
          <div className="sm:text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portx-logo.png" alt="Portx Infotech" className="h-10 mb-1 ml-auto" />
            <p className="text-lg font-bold text-gray-900">{company.name}</p>
            <p className="text-xs text-gray-500">GSTIN: {company.gstin}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
          <div><span className="text-gray-400 text-xs uppercase">Invoice Date</span><p className="font-medium">{invoice.invoice_date}</p></div>
          <div><span className="text-gray-400 text-xs uppercase">Due Date</span><p className="font-medium">{invoice.due_date}</p></div>
          <div><span className="text-gray-400 text-xs uppercase">HSN/SAC Code</span><p className="font-medium">{invoice.hsn_code || company.hsn_code}</p></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-violet-600 uppercase mb-2 tracking-wider">Billed By</h3>
            <p className="font-medium text-sm">{company.name}</p>
            <p className="text-xs text-gray-500 whitespace-pre-line mt-1">{company.address}</p>
            <p className="text-xs text-gray-500 mt-1">GSTIN: {company.gstin} &middot; PAN: {company.pan}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-violet-600 uppercase mb-2 tracking-wider">Billed To</h3>
            <p className="font-medium text-sm">{invoice.client_name}</p>
            <p className="text-xs text-gray-500 whitespace-pre-line mt-1">{invoice.client_address}</p>
            {invoice.client_gstin && <p className="text-xs text-gray-500 mt-1">GSTIN: {invoice.client_gstin}</p>}
          </div>
        </div>

        {/* Items Table */}
        <p className="text-xs text-gray-400 mb-2 sm:hidden">Swipe to see all columns &rarr;</p>
        <div className="rounded-lg border border-gray-200 overflow-x-auto mb-6">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-violet-600 text-white">
                <th className="px-3 py-2.5 text-left text-xs font-medium">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">GST %</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Rate</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium">Amount</th>
                {hasCgstSgst && <th className="px-3 py-2.5 text-right text-xs font-medium">CGST</th>}
                {hasCgstSgst && <th className="px-3 py-2.5 text-right text-xs font-medium">SGST</th>}
                {hasIgst && <th className="px-3 py-2.5 text-right text-xs font-medium">IGST</th>}
                <th className="px-3 py-2.5 text-right text-xs font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => {
                const amount = item.quantity * item.rate;
                const tax = amount * (item.gst_rate / 100);
                const cgst = hasCgstSgst ? tax / 2 : 0;
                const sgst = hasCgstSgst ? tax / 2 : 0;
                const igst = hasIgst ? tax : 0;
                const lineTotal = amount + cgst + sgst + igst;
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{item.gst_rate}%</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.rate, cur)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(amount, cur)}</td>
                    {hasCgstSgst && <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(cgst, cur)}</td>}
                    {hasCgstSgst && <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(sgst, cur)}</td>}
                    {hasIgst && <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(igst, cur)}</td>}
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(lineTotal, cur)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-violet-50 rounded-lg p-3 mb-6 text-sm">
          <span className="text-gray-500">Amount in Words: </span>
          <span className="font-medium text-gray-800">{numberToWords(invoice.total, cur)}</span>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-8">
          <div className="text-sm space-y-1">
            <h3 className="text-xs font-semibold text-violet-600 uppercase mb-2 tracking-wider">Bank Details</h3>
            <p className="text-gray-600"><span className="text-gray-400">Bank:</span> {company.bank_name}</p>
            <p className="text-gray-600"><span className="text-gray-400">Account:</span> {company.account_name}</p>
            <p className="text-gray-600"><span className="text-gray-400">A/C No:</span> {company.account_number}</p>
            <p className="text-gray-600"><span className="text-gray-400">IFSC:</span> {company.ifsc}</p>
            <p className="text-gray-600"><span className="text-gray-400">SWIFT:</span> {company.swift_code}</p>
          </div>
          <div className="w-full sm:w-72 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(invoice.subtotal, cur)}</span></div>
            {hasCgstSgst && (
              <>
                <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(invoice.cgst, cur)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(invoice.sgst, cur)}</span></div>
              </>
            )}
            {hasIgst && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(invoice.igst, cur)}</span></div>}
            <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
              <span>Total ({cur})</span><span className="text-violet-700">{formatCurrency(invoice.total, cur)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <>
                <div className="flex justify-between text-emerald-600"><span>Paid</span><span>-{formatCurrency(invoice.amount_paid, cur)}</span></div>
                <div className="flex justify-between font-bold">
                  <span>Balance</span>
                  <span className={balance > 0.01 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(balance, cur)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-4 text-center">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{company.name}</span>
            {company.cin ? <span> | CIN: {company.cin}</span> : null}
            {company.email || company.phone ? (
              <span> | {[company.email, company.phone].filter(Boolean).join(" | ")}</span>
            ) : null}
          </p>
          <p className="text-[10px] text-gray-300 mt-2">
            This is an electronically generated document, no signature is required.
          </p>
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && invoice.status !== "draft" && invoice.status !== "paid" && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6 no-print">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" /> Record Payment
          </h3>
          {paymentError && <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-red-600">{paymentError}</div>}
          <div className={`grid grid-cols-1 ${cur !== "INR" ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 mb-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ({cur}) *</label>
              <input type="number" min="0.01" step="0.01" max={balance} value={payment.amount || ""}
                onChange={(e) => setPayment((p) => ({ ...p, amount: Number(e.target.value) }))}
                placeholder={`Max: ${balance.toFixed(2)}`} className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">Balance: {formatCurrency(balance, cur)}</p>
            </div>
            {cur !== "INR" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">INR Received *</label>
                <input type="number" min="0" step="0.01" value={payment.inr_amount || ""}
                  onChange={(e) => setPayment((p) => ({ ...p, inr_amount: Number(e.target.value) }))}
                  placeholder="Actual INR received" className={inputClass} />
                {payment.amount > 0 && payment.inr_amount > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Rate: ₹{(payment.inr_amount / payment.amount).toFixed(2)}/{cur}</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input type="date" value={payment.payment_date} onChange={(e) => setPayment((p) => ({ ...p, payment_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode</label>
              <select value={payment.payment_mode} onChange={(e) => setPayment((p) => ({ ...p, payment_mode: e.target.value }))} className={inputClass}>
                {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference / UTR</label>
              <input value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} placeholder="Transaction ID" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <input value={payment.notes} onChange={(e) => setPayment((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRecordPayment} disabled={paymentSaving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {paymentSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {paymentSaving ? "Saving..." : "Record Payment"}
            </button>
            <button onClick={() => { setShowPaymentForm(false); setPaymentError(""); }}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Payment History */}
      {data.payments.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden no-print">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                {cur !== "INR" && <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">INR Received</th>}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Mode</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Reference</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700">{p.payment_date}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-emerald-600">{formatCurrency(p.amount, cur)}</td>
                  {cur !== "INR" && <td className="px-4 py-2.5 text-right font-medium text-violet-600">{p.inr_amount ? formatCurrency(p.inr_amount, "INR") : "—"}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{PAYMENT_MODES.find((m) => m.value === p.payment_mode)?.label || p.payment_mode}</td>
                  <td className="px-4 py-2.5 text-gray-400 hidden sm:table-cell">{p.reference || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDeletePayment(p.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/50 border-t border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">Total Paid</td>
                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatCurrency(invoice.amount_paid, cur)}</td>
                {cur !== "INR" && (
                  <td className="px-4 py-2.5 text-right font-semibold text-violet-600">
                    {formatCurrency(data.payments.reduce((s, p) => s + (p.inr_amount || 0), 0), "INR")}
                  </td>
                )}
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" /> Send Invoice via Email
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {emailSent ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-900">Email Sent!</p>
                  <p className="text-sm text-gray-500 mt-1">Invoice {invoice.invoice_number} sent to {emailForm.to}</p>
                </div>
              ) : (
                <>
                  {emailError && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{emailError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">To *</label>
                    <input type="email" value={emailForm.to}
                      onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
                      placeholder="client@example.com" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">CC</label>
                    <input type="email" value={emailForm.cc}
                      onChange={(e) => setEmailForm((f) => ({ ...f, cc: e.target.value }))}
                      placeholder="Optional" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                    <input value={emailForm.subject}
                      onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
                    <textarea value={emailForm.message} rows={3}
                      onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Custom message (leave empty for default template)"
                      className={inputClass} />
                  </div>
                  <p className="text-xs text-gray-400">Invoice PDF will be attached automatically.</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSendEmail} disabled={emailSending}
                      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {emailSending ? "Sending..." : "Send Email"}
                    </button>
                    <button onClick={() => setShowEmailModal(false)}
                      className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
