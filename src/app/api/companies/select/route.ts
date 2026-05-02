import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { setActiveCompany } from "@/lib/auth";

export async function POST(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Company id required" }, { status: 400 });

  const doc = await adminDb.collection("companies").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  await setActiveCompany(id);
  return NextResponse.json({ ok: true, id });
}
