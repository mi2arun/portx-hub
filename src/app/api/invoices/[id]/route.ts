import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getGstType, calculateItemTotals } from "@/lib/gst";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  if (!invoiceDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoiceData = invoiceDoc.data()!;
  const invoice = { id: invoiceDoc.id, ...invoiceData };

  // Fetch client details
  let clientData: Record<string, unknown> = {};
  if (invoiceData.client_id) {
    const clientDoc = await adminDb.collection("clients").doc(invoiceData.client_id).get();
    if (clientDoc.exists) clientData = clientDoc.data()!;
  }

  // Fetch company
  const companyDoc = await adminDb.collection("company").doc("default").get();
  const company = { id: companyDoc.id, ...companyDoc.data() };

  // Fetch payments
  const paymentSnap = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const payments = paymentSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.payment_date || "").localeCompare(a.payment_date || ""));

  // Merge client details into invoice for compatibility
  const fullInvoice = {
    ...invoice,
    client_name: invoiceData.client_name || clientData.name || "",
    client_address: clientData.address || "",
    client_state: clientData.state || "",
    client_country: clientData.country || "",
    client_gstin: clientData.gstin || "",
    client_pan: clientData.pan || "",
    client_is_international: clientData.is_international ? 1 : 0,
  };

  // Items are embedded in the invoice doc
  const items = invoiceData.items || [];

  return NextResponse.json({ invoice: fullInvoice, items, company, payments });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { client_id, invoice_date, due_date, items, status } = body;

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  if (!invoiceDoc.exists) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const existing = invoiceDoc.data()!;

  // Allow status transitions but block content edits on non-draft
  const isStatusChangeOnly = status && status !== existing.status;
  if (existing.status !== "draft" && !isStatusChangeOnly) {
    return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 403 });
  }

  const clientDoc = await adminDb.collection("clients").doc(client_id).get();
  if (!clientDoc.exists) return NextResponse.json({ error: "Client not found" }, { status: 400 });
  const client = clientDoc.data()!;

  const companyDoc = await adminDb.collection("company").doc("default").get();
  const company = companyDoc.data()!;

  const gstType = getGstType(!!client.is_international, client.state, company.state);
  const totals = calculateItemTotals(items, gstType);

  const updateData = {
    invoice_date,
    due_date,
    client_id,
    client_name: client.name,
    currency: client.currency || "INR",
    hsn_code: company.hsn_code || "",
    subtotal: totals.subtotal,
    cgst: totals.cgst,
    sgst: totals.sgst,
    igst: totals.igst,
    total: totals.total,
    status: status || "draft",
    items: items.map((item: { description: string; quantity: number; rate: number; gst_rate: number }) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      gst_rate: item.gst_rate,
      amount: item.quantity * item.rate,
    })),
    updated_at: new Date().toISOString(),
  };

  await adminDb.collection("invoices").doc(id).update(updateData);
  const updated = await adminDb.collection("invoices").doc(id).get();
  return NextResponse.json({ id: updated.id, ...updated.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  if (!invoiceDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (invoiceDoc.data()!.status !== "draft") {
    return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 403 });
  }

  // Delete related payments
  const payments = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const batch = adminDb.batch();
  payments.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(adminDb.collection("invoices").doc(id));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
