"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { TableSkeleton, CardsSkeleton } from "@/components/Skeleton";
import {
  Plus,
  Download,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  currency: string;
  total: number;
  status: string;
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  sent: { bg: "bg-blue-50", text: "text-blue-600", label: "Sent" },
  partially_paid: { bg: "bg-amber-50", text: "text-amber-600", label: "Partial" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Paid" },
};

function exportCsv(invoices: InvoiceRow[]) {
  const headers = ["Invoice #", "Date", "Client", "Currency", "Amount", "Status"];
  const rows = invoices.map((inv) => [
    inv.invoice_number, inv.invoice_date, inv.client_name,
    inv.currency, inv.total.toFixed(2), inv.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = invoices.reduce(
    (a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; },
    {} as Record<string, number>
  );

  const cards = [
    { label: "Total", value: invoices.length, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Draft", value: counts.draft || 0, icon: Clock, color: "text-gray-500", bg: "bg-gray-50" },
    { label: "Sent", value: counts.sent || 0, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Paid", value: (counts.paid || 0) + (counts.partially_paid || 0), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your invoices and track payments</p>
        </div>
        <div className="flex gap-2">
          {invoices.length > 0 && (
            <button
              onClick={() => exportCsv(filtered)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {loading ? (
        <>
          <CardsSkeleton />
          <TableSkeleton rows={5} cols={6} />
        </>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first invoice to get started.</p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</span>
                    <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      No invoices match your search
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => {
                    const sc = statusConfig[inv.status] || statusConfig.draft;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${inv.id}`} className="font-medium text-violet-600 hover:text-violet-800">
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.invoice_date}</td>
                        <td className="px-4 py-3 text-gray-700">{inv.client_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-gray-400 hover:text-violet-600 text-xs font-medium"
                          >
                            View
                          </Link>
                          {inv.status === "draft" && (
                            <>
                              <span className="mx-1 text-gray-200">|</span>
                              <Link
                                href={`/invoices/${inv.id}/edit`}
                                className="text-gray-400 hover:text-violet-600 text-xs font-medium"
                              >
                                Edit
                              </Link>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
