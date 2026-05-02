import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedDocument(id: string, companyId: string) {
  const doc = await adminDb.collection("documents").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const doc = await getScopedDocument(id, companyId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedDocument(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, category, notes, client_id } = body;

  const updateData: Record<string, string> = {};
  if (name !== undefined) updateData.name = name;
  if (category !== undefined) updateData.category = category;
  if (notes !== undefined) updateData.notes = notes;
  if (client_id !== undefined) updateData.client_id = client_id;

  await adminDb.collection("documents").doc(id).update(updateData);
  const doc = await adminDb.collection("documents").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedDocument(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminDb.collection("documents").doc(id).delete();
  return NextResponse.json({ ok: true });
}
