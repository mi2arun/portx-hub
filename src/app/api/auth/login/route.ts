import { NextResponse } from "next/server";
import { createSession, setActiveCompany } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: "ID token required" }, { status: 400 });
  }

  try {
    await createSession(idToken);

    // If there's exactly one company, auto-select it so the user skips the picker
    const snap = await adminDb.collection("companies").limit(2).get();
    if (snap.size === 1) {
      await setActiveCompany(snap.docs[0].id);
      return NextResponse.json({ ok: true, redirect: "/" });
    }

    return NextResponse.json({ ok: true, redirect: "/select-company" });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
