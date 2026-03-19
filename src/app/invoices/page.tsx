"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { CardsSkeleton, TableSkeleton } from "@/components/Skeleton";
import DataTable from "@/components/DataTable";
import DateFilter from "@/components/DateFilter";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Plus, Download, FileText, Clock, Send, CheckCircle2, Search, Filter,
} from "lucide-react";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  currency: string;
  total: number;
  amount_paid: number;
  status: string;
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  sent: { bg: "bg-blue-50", text: "text-blue-600", label: "Sent" },
  partially_paid: { bg: "bg-amber-50", text: "text-amber-600", label: "Partial" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Paid" },
};

function exportCsv(invoices: InvoiceRow[]) {
  const headers = ["Invoice #", "Date", "Client", "Currency", "Amount", "Paid", "Status"];
  const rows = invoices.map((inv) => [
    inv.invoice_number, inv.invoice_date, inv.client_name,
    inv.currency, inv.total.toFixed(2), (inv.amount_paid || 0).toFixed(2), inv.status,
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => { setInvoices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesFrom = !dateRange.from || inv.invoice_date >= dateRange.from;
    const matchesTo = !dateRange.to || inv.invoice_date <= dateRange.to;
    return matchesStatus && matchesFrom && matchesTo;
  }), [invoices, statusFilter, dateRange]);

  const counts = invoices.reduce(
    (a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; },
    {} as Record<string, number>
  );

  const columns = useMemo<ColumnDef<InvoiceRow, any>[]>(() => [
    {
      accessorKey: "invoice_number",
      header: "Invoice",
      cell: ({ row }) => (
        <Link href={`/invoices/${row.original.id}`} className="font-medium text-violet-600 hover:text-violet-800">
          {row.original.invoice_number}
        </Link>
      ),
      size: 120,
    },
    {
      accessorKey: "invoice_date",
      header: "Date",
      size: 110,
      meta: { cellClass: "text-gray-500" },
    },
    {
      accessorKey: "client_name",
      header: "Client",
    },
    {
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(row.original.total, row.original.currency)}
        </span>
      ),
      meta: { headerClass: "text-right", cellClass: "text-right" },
      size: 130,
    },
    {
      accessorKey: "amount_paid",
      header: "Paid",
      cell: ({ row }) => {
        const paid = row.original.amount_paid || 0;
        return paid > 0 ? (
          <span className="text-emerald-600">{formatCurrency(paid, row.original.currency)}</span>
        ) : <span className="text-gray-300">—</span>;
      },
      meta: { headerClass: "text-right", cellClass: "text-right" },
      size: 120,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue() as string;
        const sc = statusConfig[s] || statusConfig.draft;
        return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>;
      },
      meta: { headerClass: "text-center", cellClass: "text-center" },
      size: 100,
      enableGlobalFilter: false,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Link href={`/invoices/${row.original.id}`} className="text-xs font-medium text-gray-400 hover:text-violet-600">View</Link>
          {row.original.status === "draft" && (
            <>
              <span className="text-gray-200">|</span>
              <Link href={`/invoices/${row.original.id}/edit`} className="text-xs font-medium text-gray-400 hover:text-violet-600">Edit</Link>
            </>
          )}
        </div>
      ),
      meta: { headerClass: "text-right", cellClass: "text-right" },
      size: 80,
    },
  ], []);

  const cards = [
    { label: "Total", value: invoices.length, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Draft", value: counts.draft || 0, icon: Clock, color: "text-gray-500", bg: "bg-gray-50" },
    { label: "Sent", value: counts.sent || 0, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Paid", value: (counts.paid || 0) + (counts.partially_paid || 0), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your invoices and track payments</p>
        </div>
        <div className="flex gap-2">
          {invoices.length > 0 && (
            <button onClick={() => exportCsv(filtered)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export
            </button>
          )}
          <Link href="/invoices/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      {loading ? (
        <><CardsSkeleton /><TableSkeleton rows={5} cols={7} /></>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first invoice to get started.</p>
          <Link href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
        </div>
      ) : (
        <>
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

          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search invoices..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none bg-white focus:ring-violet-500 focus:border-violet-500">
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <DateFilter value={dateRange} onChange={setDateRange} />
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            searchValue={search}
            pageSize={15}
            emptyMessage="No invoices match your filters"
          />
        </>
      )}
    </div>
  );
}
