import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await adminDb.collection("documents").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  const doc = await adminDb.collection("documents").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await adminDb.collection("documents").doc(id).delete();
  return NextResponse.json({ ok: true });
}
