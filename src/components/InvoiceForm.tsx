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
  country: string;
};

type LineItem = {
  description: string;
  quantity: number;
  rate: number;
  gst_rate: number;
};

type ExportType = "lut" | "with_tax" | "";

type InvoiceFormProps = {
  invoiceId?: string;
  initialData?: {
    client_id: string;
    invoice_date: string;
    due_date: string;
    status: string;
    items: LineItem[];
    place_of_supply?: string;
    export_type?: ExportType;
    notes?: string;
    po_reference?: string;
  };
};

export default function InvoiceForm({ invoiceId, initialData }: InvoiceFormProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [companyState, setCompanyState] = useState("");
  const [companyLutEnabled, setCompanyLutEnabled] = useState(false);
  const [companyLutArn, setCompanyLutArn] = useState("");
  const [clientId, setClientId] = useState<string>(initialData?.client_id || "");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(initialData?.place_of_supply || "");
  const [placeOfSupplyTouched, setPlaceOfSupplyTouched] = useState(!!initialData?.place_of_supply);
  const [exportType, setExportType] = useState<ExportType>(initialData?.export_type || "");
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [poReference, setPoReference] = useState<string>(initialData?.po_reference || "");
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
      setCompanyLutEnabled(!!d?.lut_enabled);
      setCompanyLutArn(d?.lut_arn || "");
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

  // Auto-fill place_of_supply from client when user hasn't manually edited it.
  useEffect(() => {
    if (placeOfSupplyTouched) return;
    if (!selectedClient) return;
    const def = selectedClient.is_international
      ? selectedClient.country || ""
      : selectedClient.state || "";
    if (def) setPlaceOfSupply(def);
  }, [selectedClient, placeOfSupplyTouched]);

  // Default export_type when client switches to international
  useEffect(() => {
    if (!isInternational) {
      if (exportType !== "") setExportType("");
      return;
    }
    if (!exportType) {
      setExportType(companyLutEnabled ? "lut" : "with_tax");
    } else if (exportType === "lut" && !companyLutEnabled) {
      setExportType("with_tax");
    }
  }, [isInternational, companyLutEnabled, exportType]);

  const calcTax = useCallback(() => {
    if (isInternational) {
      // LUT export → 0%, with-tax export → IGST on item gst_rate
      if (exportType === "with_tax") {
        let totalIgst = 0;
        for (const item of items) {
          totalIgst += item.quantity * item.rate * (item.gst_rate / 100);
        }
        return { cgst: 0, sgst: 0, igst: Math.round(totalIgst * 100) / 100 };
      }
      return { cgst: 0, sgst: 0, igst: 0 };
    }
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
  }, [items, isInternational, selectedClient, companyState, exportType]);

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
      const noTaxOnLines = isInternational && exportType !== "with_tax";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId, invoice_date: invoiceDate, due_date: dueDate,
          items: items.map((i) => ({ ...i, gst_rate: noTaxOnLines ? 0 : i.gst_rate })),
          status,
          place_of_supply: placeOfSupply,
          export_type: isInternational ? exportType : "",
          notes,
          po_reference: poReference,
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

      {/* Place of Supply + PO Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Place of Supply
            <span className="text-xs text-gray-400 font-normal ml-2">
              {isInternational ? "country" : "state"}, auto-filled from client
            </span>
          </label>
          <input
            value={placeOfSupply}
            onChange={(e) => { setPlaceOfSupply(e.target.value); setPlaceOfSupplyTouched(true); }}
            placeholder={isInternational ? "e.g., Ireland" : "e.g., Tamil Nadu"}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            PO Reference
            <span className="text-xs text-gray-400 font-normal ml-2">optional</span>
          </label>
          <input
            value={poReference}
            onChange={(e) => setPoReference(e.target.value)}
            placeholder="Customer PO number, e.g., PO/45624"
            className={inputClass}
          />
        </div>
      </div>

      {isInternational && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <Globe className="w-4 h-4" />
            Export of services
          </div>
          <p className="text-xs text-blue-800">
            Choose how this export is being treated for GST purposes:
          </p>
          <div className="space-y-2">
            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border ${exportType === "lut" ? "border-violet-300 bg-white" : "border-transparent hover:bg-white/50"} ${!companyLutEnabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input
                type="radio"
                name="export_type"
                value="lut"
                checked={exportType === "lut"}
                disabled={!companyLutEnabled}
                onChange={() => companyLutEnabled && setExportType("lut")}
                className="mt-0.5 text-violet-600"
              />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-gray-900">Without payment of tax (LUT)</div>
                <div className="text-gray-500 mt-0.5">
                  0% IGST. Prints &ldquo;EXPORT OF SERVICES WITHOUT PAYMENT OF TAX UNDER LUT&rdquo; with ARN on the invoice.
                </div>
                {!companyLutEnabled && (
                  <div className="text-amber-700 mt-1">⚠ LUT not enabled in Settings — pick this only after configuring it.</div>
                )}
                {companyLutEnabled && companyLutArn && (
                  <div className="text-gray-400 mt-1 font-mono">ARN: {companyLutArn}</div>
                )}
              </div>
            </label>
            <label className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border ${exportType === "with_tax" ? "border-violet-300 bg-white" : "border-transparent hover:bg-white/50"}`}>
              <input
                type="radio"
                name="export_type"
                value="with_tax"
                checked={exportType === "with_tax"}
                onChange={() => setExportType("with_tax")}
                className="mt-0.5 text-violet-600"
              />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-gray-900">With payment of IGST</div>
                <div className="text-gray-500 mt-0.5">
                  Charge IGST on each line item; refund claimable. Use only if you do not have an active LUT.
                </div>
              </div>
            </label>
          </div>
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
                    {(() => {
                      const noTax = isInternational && exportType !== "with_tax";
                      const shown = noTax ? 0 : item.gst_rate;
                      return (
                        <input
                          type="number"
                          value={shown}
                          disabled={noTax}
                          onChange={(e) => updateItem(i, "gst_rate", Number(e.target.value))}
                          tabIndex={noTax ? -1 : undefined}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-right focus:ring-violet-500 focus:border-violet-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      );
                    })()}
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
          {tax.cgst > 0 && (
            <>
              <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{formatCurrency(tax.cgst, currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{formatCurrency(tax.sgst, currency)}</span></div>
            </>
          )}
          {tax.igst > 0 && (
            <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{formatCurrency(tax.igst, currency)}</span></div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-base">
            <span>Total</span>
            <span className="text-violet-700">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Additional notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Additional Notes <span className="text-xs text-gray-400 font-normal ml-1">(optional, printed on PDF)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g., Payment terms, delivery instructions"
          className={inputClass}
        />
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
