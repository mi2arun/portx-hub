"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { CardsSkeleton } from "@/components/Skeleton";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  FileText, Receipt, ArrowRight, Users, CreditCard,
  PieChart, BarChart3, Clock,
} from "lucide-react";

type DashboardData = {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  totalExpenses: number;
  totalGstPaid: number;
  gstOutput: number;
  gstNet: number;
  profit: number;
  invoiceCount: number;
  statusCounts: Record<string, number>;
  topClients: { name: string; total: number; paid: number }[];
  topExpenseCategories: { category: string; amount: number }[];
  recentInvoices: {
    id: string;
    invoice_number: string;
    client_name: string;
    total: number;
    currency: string;
    status: string;
    invoice_date: string;
  }[];
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  sent: { bg: "bg-blue-50", text: "text-blue-600", label: "Sent" },
  partially_paid: { bg: "bg-amber-50", text: "text-amber-600", label: "Partial" },
  paid: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Paid" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <CardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />
          <div className="h-64 bg-white rounded-xl border border-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Failed to load dashboard</p>
      </div>
    );
  }

  const maxCatAmount = data.topExpenseCategories.length > 0
    ? Math.max(...data.topExpenseCategories.map((c) => c.amount))
    : 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business overview and key metrics</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Invoiced"
          value={formatCurrency(data.totalInvoiced, "INR")}
          icon={FileText}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(data.totalCollected, "INR")}
          icon={CreditCard}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(data.totalOutstanding, "INR")}
          icon={Clock}
          color="text-blue-600"
          bg="bg-blue-50"
          sub={data.overdueCount > 0 ? `${data.overdueCount} overdue` : undefined}
          subColor="text-red-500"
        />
        <MetricCard
          label="Expenses"
          value={formatCurrency(data.totalExpenses, "INR")}
          icon={Receipt}
          color="text-red-500"
          bg="bg-red-50"
        />
      </div>

      {/* Profit + GST row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">Net Profit</span>
            {data.profit >= 0
              ? <TrendingUp className="w-4 h-4 text-emerald-500" />
              : <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <p className={`text-xl font-bold ${data.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(Math.abs(data.profit), "INR")}
          </p>
          <p className="text-xs text-gray-400 mt-1">Collected minus expenses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">GST Output</span>
            <Wallet className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(data.gstOutput, "INR")}</p>
          <p className="text-xs text-gray-400 mt-1">Tax collected on invoices</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">Net GST Payable</span>
            {data.gstNet > 0
              ? <AlertTriangle className="w-4 h-4 text-amber-500" />
              : <TrendingDown className="w-4 h-4 text-emerald-500" />}
          </div>
          <p className={`text-xl font-bold ${data.gstNet > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {formatCurrency(Math.abs(data.gstNet), "INR")}
          </p>
          <p className="text-xs text-gray-400 mt-1">Output ({formatCurrency(data.gstOutput, "INR")}) - ITC ({formatCurrency(data.totalGstPaid, "INR")})</p>
        </div>
      </div>

      {/* Middle section: Top Clients + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Clients */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-500" /> Top Clients
            </h3>
            <Link href="/clients" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topClients.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">No clients yet</p>
            ) : (
              data.topClients.map((client, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-400">
                      Collected: {formatCurrency(client.paid, "INR")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(client.total, "INR")}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-violet-500" /> Expense Breakdown
            </h3>
            <Link href="/expenses" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {data.topExpenseCategories.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No expenses yet</p>
            ) : (
              data.topExpenseCategories.map((cat, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{cat.category}</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(cat.amount, "INR")}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full"
                      style={{ width: `${(cat.amount / maxCatAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-500" /> Recent Invoices
          </h3>
          <Link href="/invoices" className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Date</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No invoices yet</td>
                </tr>
              ) : (
                data.recentInvoices.map((inv: any) => {
                  const sc = statusConfig[inv.status] || statusConfig.draft;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5">
                        <Link href={`/invoices/${inv.id}`} className="font-medium text-violet-600 hover:text-violet-800">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-gray-500 hidden sm:table-cell">{inv.invoice_date}</td>
                      <td className="px-5 py-2.5 text-gray-700">{inv.client_name}</td>
                      <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                        {formatCurrency(inv.total, inv.currency || "INR")}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/invoices/new"
          className="flex items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl text-sm font-medium text-violet-700 hover:bg-violet-100">
          <FileText className="w-4 h-4" /> New Invoice
        </Link>
        <Link href="/expenses"
          className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm font-medium text-red-700 hover:bg-red-100">
          <Receipt className="w-4 h-4" /> Add Expense
        </Link>
        <Link href="/clients"
          className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-medium text-blue-700 hover:bg-blue-100">
          <Users className="w-4 h-4" /> Clients
        </Link>
        <Link href="/invoices"
          className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-medium text-emerald-700 hover:bg-emerald-100">
          <BarChart3 className="w-4 h-4" /> All Invoices
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, icon: Icon, color, bg, sub, subColor,
}: {
  label: string; value: string; icon: any; color: string; bg: string;
  sub?: string; subColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor || "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
