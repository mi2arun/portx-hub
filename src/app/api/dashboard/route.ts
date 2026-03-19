import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const [invoicesSnap, expensesSnap, paymentsSnap] = await Promise.all([
    adminDb.collection("invoices").get(),
    adminDb.collection("expenses").get(),
    adminDb.collection("payments").get(),
  ]);

  const invoices = invoicesSnap.docs.map((d) => d.data());
  const expenses = expensesSnap.docs.map((d) => d.data());
  const payments = paymentsSnap.docs.map((d) => d.data());

  // Revenue
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const totalOutstanding = totalInvoiced - totalCollected;

  // Overdue
  const today = new Date().toISOString().split("T")[0];
  const overdueInvoices = invoices.filter(
    (i) => (i.status === "sent" || i.status === "partially_paid") && i.due_date < today
  );
  const overdueAmount = overdueInvoices.reduce(
    (s, i) => s + (i.total || 0) - (i.amount_paid || 0), 0
  );

  // Expenses
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalGstPaid = expenses.reduce((s, e) => s + (e.gst_amount || 0), 0);

  // GST
  const gstOutput = invoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
  const gstNet = gstOutput - totalGstPaid;

  // Profit (cash basis)
  const profit = totalCollected - totalExpenses;

  // Invoice status counts
  const statusCounts: Record<string, number> = {};
  invoices.forEach((i) => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

  // Monthly revenue (last 6 months)
  const monthlyRevenue: Record<string, number> = {};
  const monthlyExpenses: Record<string, number> = {};
  invoices.forEach((i) => {
    if (i.invoice_date) {
      const month = i.invoice_date.slice(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (i.total || 0);
    }
  });
  expenses.forEach((e) => {
    if (e.date) {
      const month = e.date.slice(0, 7);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (e.amount || 0);
    }
  });

  // Top clients by revenue
  const clientRevenue: Record<string, { name: string; total: number; paid: number }> = {};
  invoices.forEach((i) => {
    const name = i.client_name || "Unknown";
    if (!clientRevenue[name]) clientRevenue[name] = { name, total: 0, paid: 0 };
    clientRevenue[name].total += i.total || 0;
    clientRevenue[name].paid += i.amount_paid || 0;
  });
  const topClients = Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5);

  // Expense by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseByCategory[e.category || "Other"] = (expenseByCategory[e.category || "Other"] || 0) + (e.amount || 0);
  });
  const topExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, amount]) => ({ category, amount }));

  // Recent activity
  const recentInvoices = invoicesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 5);

  return NextResponse.json({
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    totalExpenses,
    totalGstPaid,
    gstOutput,
    gstNet,
    profit,
    invoiceCount: invoices.length,
    statusCounts,
    monthlyRevenue,
    monthlyExpenses,
    topClients,
    topExpenseCategories,
    recentInvoices,
  });
}
