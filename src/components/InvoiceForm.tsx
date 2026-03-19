"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { Plus, X, Trash2, UserPlus, Globe, Loader2 } from "lucide-react";

type Client = {
  id: string;
  name: string;
  currency: string;
  is_international: boolean;
  state: string;
};

type LineItem = {
  description: string;
  quantity: number;
  rate: number;
  gst_rate: number;
};

type InvoiceFormProps = {
  invoiceId?: string;
  initialData?: {
    client_id: string;
    invoice_date: string;
    due_date: string;
    status: string;
    items: LineItem[];
  };
};

export default function InvoiceForm({ invoiceId, initialData }: InvoiceFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [companyState, setCompanyState] = useState("");
  const [clientId, setClientId] = useState<string>(initialData?.client_id || "");
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoice_date || new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData?.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [items, setItems] = useState<LineItem[]>(
    initialData?.items || [{ description: "", quantity: 1, rate: 0, gst_rate: 18 }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "", address: "", state: "", country: "India",
    gstin: "", pan: "", currency: "INR", is_international: false,
  });

  function loadClients() {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
  }

  useEffect(() => {
    loadClients();
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d?.state) setCompanyState(d.state);
    }).catch(() => {});
  }, []);

  async function handleQuickAddClient() {
    if (!newClient.name.trim()) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });
    if (res.ok) {
      const created = await res.json();
      loadClients();
      setClientId(created.id);
      setShowNewClient(false);
      setNewClient({ name: "", address: "", state: "", country: "India", gstin: "", pan: "", currency: "INR", is_international: false });
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId);
  const currency = selectedClient?.currency || "INR";
  const isInternational = selectedClient?.is_international;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  const calcTax = useCallback(() => {
    if (isInternational) return { cgst: 0, sgst: 0, igst: 0 };
    let totalCgst = 0, totalSgst = 0, totalIgst = 0;
    for (const item of items) {
      const amount = item.quantity * item.rate;
      const tax = amount * (item.gst_rate / 100);
      const sameState = companyState && selectedClient?.state
        && selectedClient.state.toLowerCase() === companyState.toLowerCase();
      if (sameState) { totalCgst += tax / 2; totalSgst += tax / 2; }
      else { totalIgst += tax; }
    }
    return {
      cgst: Math.round(totalCgst * 100) / 100,
      sgst: Math.round(totalSgst * 100) / 100,
      igst: Math.round(totalIgst * 100) / 100,
    };
  }, [items, isInternational, selectedClient, companyState]);

  const tax = calcTax();
  const total = subtotal + tax.cgst + tax.sgst + tax.igst;
  const dateWarning = invoiceDate && dueDate && dueDate < invoiceDate;

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, rate: 0, gst_rate: 18 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(status: string) {
    setError("");
    if (!clientId) { setError("Please select a client"); return; }
    if (items.some((i) => !i.description.trim())) { setError("Please fill all item descriptions"); return; }
    if (items.some((i) => i.quantity <= 0)) { setError("Quantity must be greater than 0"); return; }
    if (items.some((i) => i.rate < 0)) { setError("Rate cannot be negative"); return; }

    setSaving(true);
    try {
      const url = invoiceId ? `/api/invoices/${invoiceId}` : "/api/invoices";
      const method = invoiceId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId, invoice_date: invoiceDate, due_date: dueDate,
          items: items.map((i) => ({ ...i, gst_rate: isInternational ? 0 : i.gst_rate })),
          status,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to save invoice"); }
      const data = await res.json();
      router.push(`/invoices/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
      setSaving(false);
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Client *</label>
          <div className="flex gap-2">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={`flex-1 ${inputClass}`}>
              <option value="">Select a client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.currency})</option>)}
            </select>
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-violet-600 hover:bg-violet-50 text-sm whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Date</label>
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={invoiceDate}
            className={`${inputClass} ${dateWarning ? "border-amber-400" : ""}`} />
          {dateWarning && <p className="text-amber-600 text-xs mt-1">Due date is before invoice date</p>}
        </div>
      </div>

      {/* Quick Add Client */}
      {showNewClient && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-violet-500" /> Quick Add Client
            </h3>
            <button type="button" onClick={() => setShowNewClient(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} className={inputClass} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
              <input value={newClient.country} onChange={(e) => setNewClient((c) => ({ ...c, country: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={newClient.currency} onChange={(e) => setNewClient((c) => ({ ...c, currency: e.target.value }))} className={inputClass}>
                {["INR", "USD", "EUR", "GBP", "AUD", "SGD", "AED", "HKD"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={newClient.is_international}
                onChange={(e) => setNewClient((c) => ({ ...c, is_international: e.target.checked, currency: e.target.checked && c.currency === "INR" ? "USD" : c.currency }))}
                className="rounded border-gray-300 text-violet-600" />
              <Globe className="w-3.5 h-3.5 text-gray-400" /> International
            </label>
            <button type="button" onClick={handleQuickAddClient} disabled={!newClient.name.trim()}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> Add Client
            </button>
          </div>
        </div>
      )}

      {isInternational && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
          <Globe className="w-4 h-4 flex-shrink-0" />
          International client — GST will be 0%
        </div>
      )}

      {/* Line Items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
        <p className="text-xs text-gray-400 mb-2 sm:hidden">Swipe to see all columns &rarr;</p>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 rounded-lg border border-gray-200">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">GST %</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Rate</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Amount</th>
                <th className="px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-2 py-1.5">
                    <input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                      placeholder="Service description" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-violet-500 focus:border-violet-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" value={isInternational ? 0 : item.gst_rate} disabled={!!isInternational}
                      onChange={(e) => updateItem(i, "gst_rate", Number(e.target.value))} tabIndex={isInternational ? -1 : undefined}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:ring-violet-500 focus:border-violet-500 disabled:bg-gray-100 disabled:text-gray-400" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Math.max(1, Number(e.target.value)))}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:ring-violet-500 focus:border-violet-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(i, "rate", Math.max(0, Number(e.target.value)))}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:ring-violet-500 focus:border-violet-500" />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                    {formatCurrency(item.quantity * item.rate, currency)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addItem}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 rounded-lg text-sm font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Line Item
        </button>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full sm:w-72 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
          </div>
          {!isInternational && tax.cgst > 0 && (
            <>
              <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(tax.cgst, currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(tax.sgst, currency)}</span></div>
            </>
          )}
          {!isInternational && tax.igst > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(tax.igst, currency)}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
            <span>Total</span>
            <span className="text-violet-700">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={() => handleSubmit("draft")} disabled={saving}
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {saving ? "Saving..." : "Save as Draft"}
        </button>
        <button type="button" onClick={() => handleSubmit("sent")} disabled={saving}
          className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shadow-sm">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : invoiceId ? "Update" : "Create & Send"}
        </button>
      </div>
    </div>
  );
}
