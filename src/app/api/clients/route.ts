import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

export async function GET() {
  const companyId = await requireActiveCompanyId();
  const snapshot = await adminDb.collection("clients")
    .where("company_id", "==", companyId).get();
  const clients = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();
  const { name, contact_name, email, address, state, country, gstin, pan, currency, is_international } = body;

  const data = {
    company_id: companyId,
    name: name || "",
    contact_name: contact_name || "",
    email: email || "",
    address: address || "",
    state: state || "",
    country: country || "",
    gstin: gstin || "",
    pan: pan || "",
    currency: currency || "INR",
    is_international: !!is_international,
  };

  const ref = await adminDb.collection("clients").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
