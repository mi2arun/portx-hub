"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";

type ClientData = {
  id?: string;
  name: string;
  address: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  currency: string;
  is_international: boolean;
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "SGD", "AED", "HKD"];

export default function ClientForm({
  client,
  onSave,
}: {
  client?: ClientData;
  onSave?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ClientData>({
    name: "", address: "", state: "", country: "India",
    gstin: "", pan: "", currency: "INR", is_international: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) setForm(client);
  }, [client]);

  function update(field: string, value: string | boolean) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "is_international" && value === true) {
        next.state = "";
        next.gstin = "";
        if (next.currency === "INR") next.currency = "USD";
      }
      if (field === "is_international" && value === false) {
        next.country = "India";
        next.currency = "INR";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = client?.id ? `/api/clients/${client.id}` : "/api/clients";
    const method = client?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    if (onSave) onSave();
    else router.push("/clients");
    router.refresh();
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Name *</label>
        <input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} placeholder="Company or individual name" />
      </div>

      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="is_international"
          checked={form.is_international}
          onChange={(e) => update("is_international", e.target.checked)}
          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <label htmlFor="is_international" className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Globe className="w-3.5 h-3.5 text-gray-400" />
          International Client
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <textarea
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Full billing address"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!form.is_international && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
            <input value={form.state} onChange={(e) => update("state", e.target.value)} className={inputClass} placeholder="e.g., Tamil Nadu" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
          <input value={form.country} onChange={(e) => update("country", e.target.value)} className={inputClass} />
        </div>
      </div>

      {!form.is_international && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">GSTIN</label>
            <input value={form.gstin} onChange={(e) => update("gstin", e.target.value)} className={inputClass} placeholder="GST number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">PAN</label>
            <input value={form.pan} onChange={(e) => update("pan", e.target.value)} className={inputClass} placeholder="PAN number" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
        <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className={inputClass}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shadow-sm"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : client?.id ? "Update Client" : "Add Client"}
      </button>
    </form>
  );
}
