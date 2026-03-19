import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  const snapshot = await adminDb.collection("clients").orderBy("name").get();
  const clients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, address, state, country, gstin, pan, currency, is_international } = body;

  const data = {
    name: name || "",
    address: address || "",
    state: state || "",
    country: country || "",
    gstin: gstin || "",
    pan: pan || "",
    currency: currency || "INR",
    is_international: !!is_international,
  };

  const ref = await adminDb.collection("clients").add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
