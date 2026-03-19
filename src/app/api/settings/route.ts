import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const doc = await adminDb.collection("company").doc("default").get();
  if (!doc.exists) return NextResponse.json(null);
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const {
    name, address, state, country, gstin, pan, hsn_code,
    bank_name, account_name, account_number, ifsc, swift_code,
    email, phone, cin,
    invoice_prefix, invoice_next_number, fy_start_month,
  } = body;

  await adminDb.collection("company").doc("default").set({
    name: name || "",
    address: address || "",
    state: state || "",
    country: country || "",
    gstin: gstin || "",
    pan: pan || "",
    hsn_code: hsn_code || "",
    bank_name: bank_name || "",
    account_name: account_name || "",
    account_number: account_number || "",
    ifsc: ifsc || "",
    swift_code: swift_code || "",
    email: email || "",
    phone: phone || "",
    cin: cin || "",
    logo_path: "/portx-logo.png",
    invoice_prefix: invoice_prefix || "A",
    invoice_next_number: invoice_next_number || 1,
    fy_start_month: fy_start_month || 4,
  }, { merge: true });

  const doc = await adminDb.collection("company").doc("default").get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
