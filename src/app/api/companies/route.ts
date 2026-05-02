import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const snapshot = await adminDb.collection("companies").orderBy("name").get();
  const companies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(companies);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name, address, state, country, gstin, pan, hsn_code,
    email, phone, cin,
    invoice_prefix, invoice_next_number, fy_start_month,
    smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const data = {
    name,
    address: address || "",
    state: state || "",
    country: country || "India",
    gstin: gstin || "",
    pan: pan || "",
    hsn_code: hsn_code || "",
    bank_accounts: [],
    email: email || "",
    phone: phone || "",
    cin: cin || "",
    logo_path: "",
    invoice_prefix: invoice_prefix || "A",
    invoice_next_number: invoice_next_number || 1,
    fy_start_month: fy_start_month || 4,
    smtp_host: smtp_host || "",
    smtp_port: smtp_port || 587,
    smtp_user: smtp_user || "",
    smtp_password: smtp_password || "",
    smtp_from_email: smtp_from_email || "",
    smtp_from_name: smtp_from_name || "",
  };

  const ref = await adminDb.collection("companies").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
