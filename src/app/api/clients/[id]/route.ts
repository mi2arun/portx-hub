import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await adminDb.collection("clients").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, address, state, country, gstin, pan, currency, is_international } = body;

  const data = {
    name: name || "",
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
  const { id } = await params;

  // Check if client has invoices
  const invoices = await adminDb.collection("invoices")
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
