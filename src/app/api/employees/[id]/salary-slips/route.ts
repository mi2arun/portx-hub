import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

async function getScopedEmployee(id: string, companyId: string) {
  const doc = await adminDb.collection("employees").doc(id).get();
  if (!doc.exists) return null;
  if (doc.data()?.company_id !== companyId) return null;
  return doc;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const employee = await getScopedEmployee(id, companyId);
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Single-field query + in-memory sort to avoid a composite index
  const snapshot = await adminDb.collection("salary_slips")
    .where("employee_id", "==", id).get();
  const slips = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (b.month || "").localeCompare(a.month || ""));
  return NextResponse.json(slips);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const employeeDoc = await getScopedEmployee(id, companyId);
  if (!employeeDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const employee = employeeDoc.data()!;

  const body = await req.json();
  const { month, total_days, paid_days, lop_days, earnings, deductions, payment_date, payment_mode, notes } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Month is required (YYYY-MM)" }, { status: 400 });
  }
  if (!Array.isArray(earnings) || earnings.length === 0) {
    return NextResponse.json({ error: "At least one earning line is required" }, { status: 400 });
  }

  // One slip per employee per month
  const existing = await adminDb.collection("salary_slips")
    .where("employee_id", "==", id).get();
  if (existing.docs.some((d) => d.data().month === month)) {
    return NextResponse.json({ error: `A payslip for ${month} already exists` }, { status: 409 });
  }

  const cleanLines = (lines: any[]) =>
    lines
      .map((l) => ({ label: String(l.label || ""), amount: Number(l.amount) || 0 }))
      .filter((l) => l.label);

  const cleanEarnings = cleanLines(earnings);
  const cleanDeductions = cleanLines(Array.isArray(deductions) ? deductions : []);
  const gross = cleanEarnings.reduce((s, l) => s + l.amount, 0);
  const totalDeductions = cleanDeductions.reduce((s, l) => s + l.amount, 0);

  const data = {
    company_id: companyId,
    employee_id: id,
    employee_code: employee.employee_code || "",
    employee_name: employee.name || "",
    designation: employee.designation || "",
    department: employee.department || "",
    month,
    total_days: Number(total_days) || 0,
    paid_days: Number(paid_days) || 0,
    lop_days: Number(lop_days) || 0,
    earnings: cleanEarnings,
    deductions: cleanDeductions,
    gross_earnings: gross,
    total_deductions: totalDeductions,
    net_pay: gross - totalDeductions,
    payment_date: payment_date || "",
    payment_mode: payment_mode || "bank_transfer",
    notes: notes || "",
    created_at: new Date().toISOString(),
  };

  const ref = await adminDb.collection("salary_slips").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
