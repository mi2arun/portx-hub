import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";
import { employeeDataFromBody } from "@/lib/employee";

export async function GET() {
  const companyId = await requireActiveCompanyId();
  const snapshot = await adminDb.collection("employees")
    .where("company_id", "==", companyId).get();
  const employees = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.designation) {
    return NextResponse.json({ error: "Designation is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const data = {
    company_id: companyId,
    ...employeeDataFromBody(body),
    created_at: now,
    updated_at: now,
  };

  const ref = await adminDb.collection("employees").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
