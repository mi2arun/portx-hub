import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";
import { randomBytes } from "crypto";

function sanitizeBankAccounts(input: unknown[]): Array<Record<string, unknown>> {
  let primarySeen = false;
  return input.map((raw) => {
    const a = raw as Record<string, unknown>;
    const isPrimary = !!a.is_primary && !primarySeen;
    if (isPrimary) primarySeen = true;
    return {
      id: typeof a.id === "string" && a.id ? a.id : randomBytes(8).toString("hex"),
      label: typeof a.label === "string" ? a.label : "",
      currency: typeof a.currency === "string" ? a.currency.toUpperCase() : "",
      beneficiary_bank: typeof a.beneficiary_bank === "string" ? a.beneficiary_bank : "",
      bank_address: typeof a.bank_address === "string" ? a.bank_address : "",
      beneficiary_account_name: typeof a.beneficiary_account_name === "string" ? a.beneficiary_account_name : "",
      beneficiary_account_number: typeof a.beneficiary_account_number === "string" ? a.beneficiary_account_number : "",
      account_type: typeof a.account_type === "string" ? a.account_type : "",
      ifsc: typeof a.ifsc === "string" ? a.ifsc : "",
      swift_code: typeof a.swift_code === "string" ? a.swift_code : "",
      iban: typeof a.iban === "string" ? a.iban : "",
      is_primary: isPrimary,
    };
  });
}

export async function GET() {
  const companyId = await requireActiveCompanyId();
  const doc = await adminDb.collection("companies").doc(companyId).get();
  if (!doc.exists) return NextResponse.json(null);
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PUT(request: Request) {
  const companyId = await requireActiveCompanyId();
  const body = await request.json();
  const {
    name, address, state, country, gstin, pan, hsn_code,
    email, phone, cin, logo_path,
    invoice_prefix, invoice_next_number, fy_start_month,
    bank_accounts,
    lut_enabled, lut_arn, lut_valid_from, lut_valid_to, lut_note,
  } = body;

  const updates: Record<string, unknown> = {
    name: name || "",
    address: address || "",
    state: state || "",
    country: country || "",
    gstin: gstin || "",
    pan: pan || "",
    hsn_code: hsn_code || "",
    email: email || "",
    phone: phone || "",
    cin: cin || "",
    invoice_prefix: invoice_prefix || "A",
    invoice_next_number: invoice_next_number || 1,
    fy_start_month: fy_start_month || 4,
    smtp_host: body.smtp_host || "",
    smtp_port: body.smtp_port || 587,
    smtp_user: body.smtp_user || "",
    smtp_password: body.smtp_password || "",
    smtp_from_email: body.smtp_from_email || "",
    smtp_from_name: body.smtp_from_name || "",
  };
  if (logo_path !== undefined) updates.logo_path = logo_path;
  if (Array.isArray(bank_accounts)) {
    updates.bank_accounts = sanitizeBankAccounts(bank_accounts);
  }
  if (lut_enabled !== undefined) updates.lut_enabled = !!lut_enabled;
  if (lut_arn !== undefined) updates.lut_arn = String(lut_arn || "");
  if (lut_valid_from !== undefined) updates.lut_valid_from = String(lut_valid_from || "");
  if (lut_valid_to !== undefined) updates.lut_valid_to = String(lut_valid_to || "");
  if (lut_note !== undefined) updates.lut_note = String(lut_note || "");
  if (body.signatory_name !== undefined) updates.signatory_name = String(body.signatory_name || "");
  if (body.signatory_designation !== undefined) updates.signatory_designation = String(body.signatory_designation || "");
  if (body.signature_url !== undefined) updates.signature_url = String(body.signature_url || "");
  if (body.place_of_signing !== undefined) updates.place_of_signing = String(body.place_of_signing || "");
  if (body.website !== undefined) updates.website = String(body.website || "");

  await adminDb.collection("companies").doc(companyId).set(updates, { merge: true });

  const doc = await adminDb.collection("companies").doc(companyId).get();
  return NextResponse.json({ id: doc.id, ...doc.data() });
}
