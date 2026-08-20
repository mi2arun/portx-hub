import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedSlip(id: string, companyId: string) {
  const doc = await adminDb.collection("salary_slips").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const doc = await getScopedSlip(id, companyId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedSlip(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminDb.collection("salary_slips").doc(id).delete();
  return NextResponse.json({ ok: true });
}
