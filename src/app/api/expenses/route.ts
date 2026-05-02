import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";

export async function GET(request: Request) {
  const companyId = await requireActiveCompanyId();
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query: FirebaseFirestore.Query = adminDb.collection("expenses")
    .where("company_id", "==", companyId);

  if (category && category !== "all") {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();
  let expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (from) {
    expenses = expenses.filter((e: any) => e.date >= from);
  }
  if (to) {
    expenses = expenses.filter((e: any) => e.date <= to);
  }

  expenses.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();
  const {
    date, amount, category, vendor, description,
    payment_mode, reference, gst_amount, vendor_gstin, is_recurring,
  } = body;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const data = {
    company_id: companyId,
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
    created_at: new Date().toISOString(),
  };

  const ref = await adminDb.collection("expenses").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
