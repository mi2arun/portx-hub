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

  // Group by currency
  const currencies = [...new Set(invoices.map((i) => i.currency || "INR"))];
  const byCurrency: Record<string, { invoiced: number; collected: number; outstanding: number; overdueAmount: number; overdueCount: number }> = {};
  const today = new Date().toISOString().split("T")[0];

  for (const cur of currencies) {
    const curInvoices = invoices.filter((i) => (i.currency || "INR") === cur);
    const invoiced = curInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const collected = curInvoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
    const overdue = curInvoices.filter(
      (i) => (i.status === "sent" || i.status === "partially_paid") && i.due_date < today
    );
    byCurrency[cur] = {
      invoiced,
      collected,
      outstanding: invoiced - collected,
      overdueAmount: overdue.reduce((s, i) => s + (i.total || 0) - (i.amount_paid || 0), 0),
      overdueCount: overdue.length,
    };
  }

  // INR totals (for backward compat + expenses are always INR)
  const inr = byCurrency["INR"] || { invoiced: 0, collected: 0, outstanding: 0, overdueAmount: 0, overdueCount: 0 };
  const totalInvoiced = inr.invoiced;
  const totalCollected = inr.collected;
  const totalOutstanding = inr.outstanding;
  const overdueAmount = inr.overdueAmount;

  // Overdue count across all currencies
  const overdueInvoices = invoices.filter(
    (i) => (i.status === "sent" || i.status === "partially_paid") && i.due_date < today
  );

  // Expenses (always INR)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalGstPaid = expenses.reduce((s, e) => s + (e.gst_amount || 0), 0);

  // GST (only from INR invoices — international invoices have 0% GST)
  const gstOutput = invoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
  const gstNet = gstOutput - totalGstPaid;

  // INR received from foreign currency payments
  const foreignInrReceived = payments.reduce((s, p) => s + (p.inr_amount || 0), 0);

  // Profit (cash basis, INR collected + foreign INR received - expenses)
  const profit = totalCollected + foreignInrReceived - totalExpenses;

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

  // Top clients by revenue (grouped by currency)
  const clientRevenue: Record<string, { name: string; currency: string; total: number; paid: number }> = {};
  invoices.forEach((i) => {
    const name = i.client_name || "Unknown";
    const cur = i.currency || "INR";
    const key = `${name}__${cur}`;
    if (!clientRevenue[key]) clientRevenue[key] = { name, currency: cur, total: 0, paid: 0 };
    clientRevenue[key].total += i.total || 0;
    clientRevenue[key].paid += i.amount_paid || 0;
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
    byCurrency,
    foreignInrReceived,
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
