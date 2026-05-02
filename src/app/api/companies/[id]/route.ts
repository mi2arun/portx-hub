import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await adminDb.collection("companies").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "name", "address", "state", "country", "gstin", "pan", "hsn_code",
    "bank_accounts",
    "email", "phone", "cin",
    "invoice_prefix", "invoice_next_number", "fy_start_month",
    "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email", "smtp_from_name",
    "logo_path",
    "lut_enabled", "lut_arn", "lut_valid_from", "lut_valid_to", "lut_note",
    "signatory_name", "signatory_designation", "signature_url", "place_of_signing", "website",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  await adminDb.collection("companies").doc(id).set(updates, { merge: true });
  const doc = await adminDb.collection("companies").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  for (const collection of ["clients", "invoices", "expenses", "documents", "payments"]) {
    const snap = await adminDb.collection(collection).where("company_id", "==", id).limit(1).get();
    if (!snap.empty) {
      return NextResponse.json(
        { error: `Cannot delete: company has ${collection}. Move or delete them first.` },
        { status: 409 }
      );
    }
  }

  await adminDb.collection("companies").doc(id).delete();
  return NextResponse.json({ ok: true });
}
