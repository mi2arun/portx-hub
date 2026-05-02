import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getGstType, calculateItemTotals, type ExportType } from "@/lib/gst";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedInvoice(id: string, companyId: string) {
  const doc = await adminDb.collection("invoices").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;

  const invoiceDoc = await getScopedInvoice(id, companyId);
  if (!invoiceDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoiceData = invoiceDoc.data()!;
  const invoice = { id: invoiceDoc.id, ...invoiceData };

  let clientData: Record<string, unknown> = {};
  if (invoiceData.client_id) {
    const clientDoc = await adminDb.collection("clients").doc(invoiceData.client_id).get();
    if (clientDoc.exists) clientData = clientDoc.data()!;
  }

  const companyDoc = await adminDb.collection("companies").doc(companyId).get();
  const company = { id: companyDoc.id, ...companyDoc.data() };

  const paymentSnap = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const payments = paymentSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.payment_date || "").localeCompare(a.payment_date || ""));

  const fullInvoice = {
    ...invoice,
    client_name: invoiceData.client_name || clientData.name || "",
    client_address: clientData.address || "",
    client_state: clientData.state || "",
    client_country: clientData.country || "",
    client_gstin: clientData.gstin || "",
    client_pan: clientData.pan || "",
    client_contact_name: clientData.contact_name || "",
    client_email: clientData.email || "",
    client_is_international: clientData.is_international ? 1 : 0,
  };

  const items = invoiceData.items || [];

  return NextResponse.json({ invoice: fullInvoice, items, company, payments });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const body = await req.json();
  const {
    client_id,
    invoice_date,
    due_date,
    items,
    status,
    place_of_supply: placeOfSupplyOverride,
    export_type: exportTypeRaw,
    notes,
    po_reference,
  } = body;

  const invoiceDoc = await getScopedInvoice(id, companyId);
  if (!invoiceDoc) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const existing = invoiceDoc.data()!;

  const isStatusChangeOnly = status && status !== existing.status;

  // Status-only update path: don't recompute taxes
  if (isStatusChangeOnly && (!items || items.length === 0)) {
    await adminDb.collection("invoices").doc(id).update({
      status,
      updated_at: new Date().toISOString(),
    });
    const updated = await adminDb.collection("invoices").doc(id).get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  }

  const clientDoc = await adminDb.collection("clients").doc(client_id).get();
  if (!clientDoc.exists || clientDoc.data()?.company_id !== companyId) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }
  const client = clientDoc.data()!;

  const companyDoc = await adminDb.collection("companies").doc(companyId).get();
  const company = companyDoc.data()!;

  const isInternational = !!client.is_international;
  let exportType: ExportType = "";
  if (isInternational) {
    if (exportTypeRaw === "lut" || exportTypeRaw === "with_tax") {
      exportType = exportTypeRaw;
    } else {
      exportType = existing.export_type || (company.lut_enabled ? "lut" : "with_tax");
    }
  }

  if (exportType === "lut" && !company.lut_enabled) {
    return NextResponse.json({ error: "LUT is not enabled on this company." }, { status: 400 });
  }
  if (exportType === "lut" && !company.lut_arn) {
    return NextResponse.json({ error: "LUT ARN is required." }, { status: 400 });
  }

  const place_of_supply =
    (typeof placeOfSupplyOverride === "string" && placeOfSupplyOverride.trim()) ||
    (isInternational ? client.country || "" : client.state || "");

  const gstType = getGstType(isInternational, client.state, company.state, exportType);
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
      gst_rate: gstType === "none" ? 0 : item.gst_rate,
      amount: item.quantity * item.rate,
    })),
    place_of_supply,
    export_type: exportType,
    lut_arn: exportType === "lut" ? (company.lut_arn || existing.lut_arn || "") : "",
    notes: typeof notes === "string" ? notes : (existing.notes || ""),
    po_reference: typeof po_reference === "string" ? po_reference : (existing.po_reference || ""),
    updated_at: new Date().toISOString(),
  };

  await adminDb.collection("invoices").doc(id).update(updateData);
  const updated = await adminDb.collection("invoices").doc(id).get();
  return NextResponse.json({ id: updated.id, ...updated.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;

  const invoiceDoc = await getScopedInvoice(id, companyId);
  if (!invoiceDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (invoiceDoc.data()!.status !== "draft") {
    return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 403 });
  }

  const payments = await adminDb.collection("payments")
    .where("invoice_id", "==", id).get();
  const batch = adminDb.batch();
  payments.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(adminDb.collection("invoices").doc(id));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
