import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const payments = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.payment_date || "").localeCompare(a.payment_date || ""));
  return NextResponse.json(payments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { amount, inr_amount, payment_date, payment_mode, reference, notes } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  if (!invoiceDoc.exists) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const invoice = invoiceDoc.data()!;
  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Cannot record payment on a draft invoice" }, { status: 400 });
  }

  const balance = invoice.total - (invoice.amount_paid || 0);
  if (amount > balance + 0.01) {
    return NextResponse.json(
      { error: `Payment exceeds balance due (${balance.toFixed(2)})` },
      { status: 400 }
    );
  }

  const paymentData: Record<string, any> = {
    invoice_id: id,
    amount,
    payment_date: payment_date || new Date().toISOString().split("T")[0],
    payment_mode: payment_mode || "bank_transfer",
    reference: reference || "",
    notes: notes || "",
    created_at: new Date().toISOString(),
  };

  // Store INR equivalent for foreign currency payments
  if (inr_amount && inr_amount > 0) {
    paymentData.inr_amount = inr_amount;
  }

  const ref = await adminDb.collection("payments").add(paymentData);

  // Update invoice
  const newAmountPaid = Math.round(((invoice.amount_paid || 0) + amount) * 100) / 100;
  const newStatus = newAmountPaid >= invoice.total ? "paid" : "partially_paid";

  await adminDb.collection("invoices").doc(id).update({
    amount_paid: newAmountPaid,
    status: newStatus,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ id: ref.id, ...paymentData }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const paymentDoc = await adminDb.collection("payments").doc(paymentId).get();
  if (!paymentDoc.exists || paymentDoc.data()?.invoice_id !== id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await adminDb.collection("payments").doc(paymentId).delete();

  // Recalculate amount_paid
  const remaining = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const totalPaid = remaining.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  const invoiceTotal = invoiceDoc.data()?.total || 0;
  const newStatus = totalPaid <= 0 ? "sent" : totalPaid >= invoiceTotal ? "paid" : "partially_paid";

  await adminDb.collection("invoices").doc(id).update({
    amount_paid: Math.round(totalPaid * 100) / 100,
    status: newStatus,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
