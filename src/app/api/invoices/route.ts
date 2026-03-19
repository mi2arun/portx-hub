import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getNextInvoiceNumber } from "@/lib/invoice-number";
import { getGstType, calculateItemTotals } from "@/lib/gst";

export async function GET() {
  const snapshot = await adminDb.collection("invoices")
    .orderBy("created_at", "desc").get();
  const invoices = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { client_id, invoice_date, due_date, items, status } = body;

  // Fetch client
  const clientDoc = await adminDb.collection("clients").doc(client_id).get();
  if (!clientDoc.exists) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }
  const client = clientDoc.data()!;

  // Fetch company
  const companyDoc = await adminDb.collection("company").doc("default").get();
  const company = companyDoc.data()!;

  const invoiceNumber = await getNextInvoiceNumber();
  const gstType = getGstType(!!client.is_international, client.state, company.state);
  const totals = calculateItemTotals(items, gstType);

  const invoiceData = {
    invoice_number: invoiceNumber,
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
    amount_paid: 0,
    items: items.map((item: { description: string; quantity: number; rate: number; gst_rate: number }) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      gst_rate: item.gst_rate,
      amount: item.quantity * item.rate,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const ref = await adminDb.collection("invoices").add(invoiceData);
  return NextResponse.json({ id: ref.id, ...invoiceData }, { status: 201 });
}
