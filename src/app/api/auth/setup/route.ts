import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const result = await adminAuth.listUsers(1);
  return NextResponse.json({ hasUsers: result.users.length > 0 });
}

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await adminAuth.listUsers(1);
  if (existing.users.length > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
  }

  try {
    // Create user in Firebase Auth
    const email = username.includes("@") ? username : `${username}@portxhub.local`;
    await adminAuth.createUser({ email, password, displayName: username });

    // Seed company data if not exists
    const companyDoc = await adminDb.collection("company").doc("default").get();
    if (!companyDoc.exists) {
      await adminDb.collection("company").doc("default").set({
        name: "Portx Infotech Private Limited",
        address: "2/394, 5th Street, Kamaraj Colony, Chromepet, Chennai - 600 044, Tamil Nadu, India",
        state: "Tamil Nadu",
        country: "India",
        gstin: "33AAJCP9411B1ZM",
        pan: "AAJCP9411B",
        hsn_code: "998314",
        bank_name: "HDFC Bank",
        account_name: "Portx Infotech Private Limited",
        account_number: "50200095076498",
        ifsc: "HDFC0001774",
        swift_code: "HDFCINBB",
        logo_path: "/portx-logo.png",
        email: "",
        phone: "",
        cin: "",
        invoice_prefix: "A",
        invoice_next_number: 1,
      });
    }

    return NextResponse.json({ ok: true, email }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
