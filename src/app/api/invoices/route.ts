import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getNextInvoiceNumber } from "@/lib/invoice-number";
import { getGstType, calculateItemTotals, type ExportType } from "@/lib/gst";
import { requireActiveCompanyId } from "@/lib/auth";

export async function GET() {
  const companyId = await requireActiveCompanyId();
  const snapshot = await adminDb.collection("invoices")
    .where("company_id", "==", companyId).get();
  const invoices = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || ""));
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();
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

  const clientDoc = await adminDb.collection("clients").doc(client_id).get();
  if (!clientDoc.exists || clientDoc.data()?.company_id !== companyId) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }
  const client = clientDoc.data()!;

  const companyDoc = await adminDb.collection("companies").doc(companyId).get();
  if (!companyDoc.exists) {
    return NextResponse.json({ error: "Company not found" }, { status: 400 });
  }
  const company = companyDoc.data()!;

  // Resolve export classification — only meaningful for international clients.
  const isInternational = !!client.is_international;
  let exportType: ExportType = "";
  if (isInternational) {
    if (exportTypeRaw === "lut" || exportTypeRaw === "with_tax") {
      exportType = exportTypeRaw;
    } else {
      // Sensible default: LUT if company has it set up, otherwise with-tax.
      exportType = company.lut_enabled ? "lut" : "with_tax";
    }
  }

  // Validate LUT prerequisites
  if (exportType === "lut" && !company.lut_enabled) {
    return NextResponse.json({ error: "LUT is not enabled on this company. Enable it in Settings → LUT." }, { status: 400 });
  }
  if (exportType === "lut" && !company.lut_arn) {
    return NextResponse.json({ error: "LUT ARN is required. Set it in Settings → LUT." }, { status: 400 });
  }

  // Place of supply: explicit override > client country (export) > client state (domestic)
  const place_of_supply =
    (typeof placeOfSupplyOverride === "string" && placeOfSupplyOverride.trim()) ||
    (isInternational ? client.country || "" : client.state || "");

  const invoiceNumber = await getNextInvoiceNumber(companyId);
  const gstType = getGstType(isInternational, client.state, company.state, exportType);
  const totals = calculateItemTotals(items, gstType);

  const invoiceData = {
    company_id: companyId,
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
      // Force 0% rate when no tax is being charged so the line items don't lie
      gst_rate: gstType === "none" ? 0 : item.gst_rate,
      amount: item.quantity * item.rate,
    })),
    place_of_supply,
    export_type: exportType,
    lut_arn: exportType === "lut" ? (company.lut_arn || "") : "",
    notes: typeof notes === "string" ? notes : "",
    po_reference: typeof po_reference === "string" ? po_reference : "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const ref = await adminDb.collection("invoices").add(invoiceData);
  return NextResponse.json({ id: ref.id, ...invoiceData }, { status: 201 });
}
