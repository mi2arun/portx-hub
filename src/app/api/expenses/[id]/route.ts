import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedExpense(id: string, companyId: string) {
  const doc = await adminDb.collection("expenses").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const doc = await getScopedExpense(id, companyId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedExpense(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    date, amount, category, vendor, description,
    payment_mode, reference, gst_amount, vendor_gstin, is_recurring,
  } = body;

  const data = {
    date,
    amount: Number(amount),
    category: category || "",
    vendor: vendor || "",
    description: description || "",
    payment_mode: payment_mode || "bank_transfer",
    reference: reference || "",
    gst_amount: Number(gst_amount) || 0,
    vendor_gstin: vendor_gstin || "",
    is_recurring: !!is_recurring,
  };

  await adminDb.collection("expenses").doc(id).update(data);
  const doc = await adminDb.collection("expenses").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedExpense(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminDb.collection("expenses").doc(id).delete();
  return NextResponse.json({ ok: true });
}
