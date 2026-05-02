import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedClient(id: string, companyId: string) {
  const doc = await adminDb.collection("clients").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const doc = await getScopedClient(id, companyId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedClient(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, contact_name, email, address, state, country, gstin, pan, currency, is_international } = body;

  const data = {
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

  await adminDb.collection("clients").doc(id).update(data);
  const doc = await adminDb.collection("clients").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedClient(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoices = await adminDb.collection("invoices")
    .where("company_id", "==", companyId)
    .where("client_id", "==", id).limit(1).get();

  if (!invoices.empty) {
    return NextResponse.json(
      { error: `Cannot delete: client has invoice(s)` },
      { status: 409 }
    );
  }

  await adminDb.collection("clients").doc(id).delete();
  return NextResponse.json({ ok: true });
}
