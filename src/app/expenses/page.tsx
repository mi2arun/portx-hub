"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { TableSkeleton, CardsSkeleton } from "@/components/Skeleton";
import {
  Plus, Search, Filter, Receipt, X, Pencil, Trash2,
  Loader2, Download, TrendingDown, Calendar, Tag,
  CreditCard, RefreshCw,
} from "lucide-react";

type Expense = {
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
};

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const emptyForm: Omit<Expense, "id"> = {
  date: new Date().toISOString().split("T")[0],
  amount: 0,
  category: "",
  vendor: "",
  description: "",
  payment_mode: "bank_transfer",
  reference: "",
  gst_amount: 0,
  vendor_gstin: "",
  is_recurring: false,
};

function exportCsv(expenses: Expense[]) {
  const headers = ["Date", "Category", "Vendor", "Description", "Amount", "GST", "Payment Mode", "Reference"];
  const rows = expenses.map((e) => [
    e.date, e.category, e.vendor, e.description,
    e.amount.toFixed(2), e.gst_amount.toFixed(2), e.payment_mode, e.reference,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function loadExpenses() {
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => { setExpenses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadExpenses(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setForm({
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
      vendor: expense.vendor,
      description: expense.description,
      payment_mode: expense.payment_mode,
      reference: expense.reference,
      gst_amount: expense.gst_amount,
      vendor_gstin: expense.vendor_gstin,
      is_recurring: expense.is_recurring,
    });
    setShowForm(true);
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!form.category) { setError("Category is required"); return; }
    if (!form.amount || form.amount <= 0) { setError("Amount must be greater than 0"); return; }
    if (!form.date) { setError("Date is required"); return; }

    setSaving(true);
    const url = editing ? `/api/expenses/${editing.id}` : "/api/expenses";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to save");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    loadExpenses();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    loadExpenses();
  }

  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      e.vendor?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);
  const totalGst = filtered.reduce((s, e) => s + (e.gst_amount || 0), 0);

  // Category breakdown
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const inputClass = "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage company expenses</p>
        </div>
        <div className="flex gap-2">
          {expenses.length > 0 && (
            <button
              onClick={() => exportCsv(filtered)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <CardsSkeleton />
          <TableSkeleton rows={5} cols={5} />
        </>
      ) : (
        <>
          {/* Summary Cards */}
          {expenses.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Expenses</span>
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, "INR")}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">GST Paid (ITC)</span>
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalGst, "INR")}</p>
              </div>
              {topCategories.slice(0, 2).map(([cat, amt]) => (
                <div key={cat} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{cat}</span>
                    <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                      <Tag className="w-4 h-4 text-violet-500" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(amt, "INR")}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-violet-500" />
                  {editing ? "Edit Expense" : "New Expense"}
                </h2>
                <button onClick={() => { setShowForm(false); setEditing(null); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Date *</label>
                    <input type="date" value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount *</label>
                    <input type="number" min="0.01" step="0.01" value={form.amount || ""}
                      onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                      placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Category *</label>
                    <select value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className={inputClass}>
                      <option value="">Select category...</option>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Payment Mode</label>
                    <select value={form.payment_mode}
                      onChange={(e) => setForm((f) => ({ ...f, payment_mode: e.target.value }))}
                      className={inputClass}>
                      {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vendor / Payee</label>
                    <input value={form.vendor}
                      onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                      placeholder="e.g., AWS, Google, Landlord" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <input value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What was this expense for?" className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>GST Amount (ITC)</label>
                    <input type="number" min="0" step="0.01" value={form.gst_amount || ""}
                      onChange={(e) => setForm((f) => ({ ...f, gst_amount: Number(e.target.value) }))}
                      placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Vendor GSTIN</label>
                    <input value={form.vendor_gstin}
                      onChange={(e) => setForm((f) => ({ ...f, vendor_gstin: e.target.value }))}
                      placeholder="For ITC claims" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Reference / Bill No.</label>
                    <input value={form.reference}
                      onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="Invoice or receipt number" className={inputClass} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2.5">
                      <input type="checkbox" checked={form.is_recurring}
                        onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 text-gray-400" /> Recurring
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shadow-sm">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : editing ? "Update Expense" : "Add Expense"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditing(null); }}
                    className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {expenses.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No expenses yet</h3>
              <p className="text-sm text-gray-500 mb-6">Start tracking your company expenses.</p>
              <button onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
          ) : (
            <>
              {/* Search & Filter */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search expenses..."
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-violet-500 focus:border-violet-500">
                    <option value="all">All Categories</option>
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">GST</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            No expenses match your search
                          </td>
                        </tr>
                      ) : (
                        filtered.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {expense.date}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 text-violet-600">
                                <Tag className="w-3 h-3" /> {expense.category}
                              </span>
                              {expense.is_recurring && (
                                <span title="Recurring"><RefreshCw className="w-3 h-3 text-amber-500 inline ml-1" /></span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{expense.vendor || "—"}</td>
                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell truncate max-w-[200px]">
                              {expense.description || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">
                              {formatCurrency(expense.amount, "INR")}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                              {expense.gst_amount ? formatCurrency(expense.gst_amount, "INR") : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => openEdit(expense)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 inline-flex" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(expense.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 inline-flex ml-1" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filtered.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50/50 border-t border-gray-100">
                          <td colSpan={4} className="px-4 py-3 text-sm font-medium text-gray-700">
                            Total ({filtered.length} expenses)
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(totalAmount, "INR")}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-500 hidden sm:table-cell">
                            {formatCurrency(totalGst, "INR")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
