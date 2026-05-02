import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

export async function GET() {
  const companyId = await requireActiveCompanyId();
  const snapshot = await adminDb.collection("documents")
    .where("company_id", "==", companyId).get();
  const documents = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.uploaded_at || "").localeCompare(a.uploaded_at || ""));
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();
  const { name, category, file_name, file_url, file_size, file_type, notes, client_id } = body;

  if (!name || !file_url) {
    return NextResponse.json({ error: "Name and file URL are required" }, { status: 400 });
  }

  const data = {
    company_id: companyId,
    name: name || "",
    category: category || "Other",
    file_name: file_name || "",
    file_url: file_url || "",
    file_size: file_size || 0,
    file_type: file_type || "",
    notes: notes || "",
    client_id: client_id || "",
    uploaded_at: new Date().toISOString(),
  };

  const ref = await adminDb.collection("documents").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
