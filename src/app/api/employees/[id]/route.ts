import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";
import { employeeDataFromBody } from "@/lib/employee";

async function getScopedEmployee(id: string, companyId: string) {
  const doc = await adminDb.collection("employees").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const doc = await getScopedEmployee(id, companyId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedEmployee(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const data = {
    ...employeeDataFromBody(body),
    updated_at: new Date().toISOString(),
  };

  await adminDb.collection("employees").doc(id).update(data);
  const doc = await adminDb.collection("employees").doc(id).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const existing = await getScopedEmployee(id, companyId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove the employee's salary slips as well
  const slips = await adminDb.collection("salary_slips")
    .where("employee_id", "==", id).get();
  const batch = adminDb.batch();
  slips.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(adminDb.collection("employees").doc(id));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
