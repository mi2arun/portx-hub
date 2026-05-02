/**
 * Imports Flowstack's three issued invoices (A0001–A0003) plus the matching
 * clients, payments, and updated company info, into Firestore under the
 * existing Flowstack company doc.
 *
 * Idempotent: skips invoices whose invoice_number+company_id already exist.
 *
 * Usage:
 *   npx tsx scripts/migrate-flowstack-invoices.ts          # dry run
 *   npx tsx scripts/migrate-flowstack-invoices.ts --apply
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const APPLY = process.argv.includes("--apply");

const sa = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8")
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const FLOWSTACK_INFO = {
  name: "FLOWSTACK TECHNOLOGIES PRIVATE LIMITED",
  address: "SF No.163/1f, D.No. 117 Sivanagar Coimbatore, Tamil Nadu, India - 641048",
  state: "Tamil Nadu",
  country: "India",
  gstin: "33AAGCF4591C1ZU",
  pan: "AAGCF4591C",
  hsn_code: "9983",
  bank_name: "ICICI",
  account_name: "Flowstack Technologies Private Limited",
  account_number: "584705000126",
  ifsc: "ICIC0005847",
  swift_code: "ICICINBBNRI",
};

type ClientSeed = {
  name: string;
  state: string;
  country: string;
  gstin: string;
  pan: string;
  address: string;
  currency: string;
  is_international: boolean;
};

const CLIENT_SEYYONE: ClientSeed = {
  name: "Seyyone Software Solutions Pvt Ltd",
  state: "Tamil Nadu",
  country: "India",
  gstin: "33AAECS7400D2ZU",
  pan: "AAECS7400D",
  address: "Tamil Nadu, India",
  currency: "INR",
  is_international: false,
};

const CLIENT_AMCSL: ClientSeed = {
  name: "ADVANCED MANUFACTURING CONTROL SYSTEMS LTD",
  state: "",
  country: "Ireland",
  gstin: "",
  pan: "",
  address: "Block C, City East Plaza, Groody Road, Ballysimon, Co. Limerick, Ireland",
  currency: "EUR",
  is_international: true,
};

type InvoiceSeed = {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client: ClientSeed;
  currency: string;
  hsn_code: string;
  items: { description: string; quantity: number; rate: number; gst_rate: number }[];
  cgst: number;
  sgst: number;
  igst: number;
  status: "paid" | "sent";
  amount_paid: number;
  payment_date?: string;
};

const INVOICES: InvoiceSeed[] = [
  {
    invoice_number: "A0001",
    invoice_date: "2025-07-01",
    due_date: "2025-07-04",
    client: CLIENT_SEYYONE,
    currency: "INR",
    hsn_code: "",
    items: [{ description: "Software Services", quantity: 1, rate: 500000, gst_rate: 0 }],
    cgst: 0, sgst: 0, igst: 0,
    status: "paid",
    amount_paid: 500000,
    payment_date: "2025-07-04",
  },
  {
    invoice_number: "A0002",
    invoice_date: "2025-07-16",
    due_date: "2025-07-31",
    client: CLIENT_SEYYONE,
    currency: "INR",
    hsn_code: "9983",
    items: [{ description: "Software Consultancy", quantity: 1, rate: 150000, gst_rate: 18 }],
    cgst: 13500, sgst: 13500, igst: 0,
    status: "paid",
    amount_paid: 177000,
    payment_date: "2025-07-31",
  },
  {
    invoice_number: "A0003",
    invoice_date: "2026-04-28",
    due_date: "2026-05-13",
    client: CLIENT_AMCSL,
    currency: "EUR",
    hsn_code: "9983",
    items: [
      { description: "Software Development Services - AI", quantity: 1, rate: 16600, gst_rate: 0 },
      { description: "Support (April)", quantity: 1, rate: 1300, gst_rate: 0 },
    ],
    cgst: 0, sgst: 0, igst: 0,
    status: "sent",
    amount_paid: 0,
  },
];

async function findFlowstackCompany() {
  const snap = await db.collection("companies").get();
  return snap.docs.find((d) => (d.data().name || "").toLowerCase().includes("flowstack")) || null;
}

async function findOrCreateClient(companyId: string, seed: ClientSeed) {
  const snap = await db.collection("clients")
    .where("company_id", "==", companyId)
    .where("name", "==", seed.name)
    .limit(1).get();

  if (!snap.empty) {
    console.log(`  ✓ client "${seed.name}" already exists (${snap.docs[0].id})`);
    return snap.docs[0].id;
  }

  const data = {
    company_id: companyId,
    name: seed.name,
    contact_name: "",
    email: "",
    address: seed.address,
    state: seed.state,
    country: seed.country,
    gstin: seed.gstin,
    pan: seed.pan,
    currency: seed.currency,
    is_international: seed.is_international,
  };

  if (APPLY) {
    const ref = await db.collection("clients").add(data);
    console.log(`  ✓ created client "${seed.name}" (${ref.id})`);
    return ref.id;
  } else {
    console.log(`  → would create client "${seed.name}"`);
    return "<new-client-id>";
  }
}

async function migrate() {
  console.log(`\n=== Flowstack invoice import (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  const companyDoc = await findFlowstackCompany();
  if (!companyDoc) {
    console.error("✗ Flowstack company doc not found. Run migrate-multi-company.ts first.");
    process.exit(1);
  }
  const companyId = companyDoc.id;
  const existing = companyDoc.data();
  console.log(`✓ Found Flowstack company: ${companyId}`);

  // 1. Update company info — fill any blank fields, never overwrite non-blanks
  console.log(`\n--- Updating Flowstack company info (only filling blanks) ---`);
  const updates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(FLOWSTACK_INFO)) {
    if (!existing[key] || existing[key] === "") {
      updates[key] = val;
    }
  }
  if (Object.keys(updates).length === 0) {
    console.log(`  ✓ all fields already set, no updates`);
  } else {
    console.log(`  → fields to fill: ${Object.keys(updates).join(", ")}`);
    if (APPLY) {
      await companyDoc.ref.update(updates);
      console.log(`  ✓ wrote ${Object.keys(updates).length} fields`);
    }
  }

  // 2. Create / find clients
  console.log(`\n--- Clients ---`);
  const seyyoneId = await findOrCreateClient(companyId, CLIENT_SEYYONE);
  const amcslId = await findOrCreateClient(companyId, CLIENT_AMCSL);

  // 3. Create invoices
  console.log(`\n--- Invoices ---`);
  let imported = 0;
  let skipped = 0;
  for (const inv of INVOICES) {
    const existsSnap = await db.collection("invoices")
      .where("company_id", "==", companyId)
      .where("invoice_number", "==", inv.invoice_number)
      .limit(1).get();
    if (!existsSnap.empty) {
      console.log(`  - ${inv.invoice_number} already exists, skipping`);
      skipped++;
      continue;
    }

    const subtotal = inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
    const total = subtotal + inv.cgst + inv.sgst + inv.igst;
    const clientId = inv.client === CLIENT_SEYYONE ? seyyoneId : amcslId;

    const invoiceData = {
      company_id: companyId,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      client_id: clientId,
      client_name: inv.client.name,
      currency: inv.currency,
      hsn_code: inv.hsn_code,
      subtotal,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      total,
      status: inv.status,
      amount_paid: inv.amount_paid,
      items: inv.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.rate,
        gst_rate: it.gst_rate,
        amount: it.quantity * it.rate,
      })),
      created_at: new Date(inv.invoice_date + "T00:00:00.000Z").toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (APPLY) {
      const ref = await db.collection("invoices").add(invoiceData);
      console.log(`  ✓ ${inv.invoice_number} created (${ref.id}) — ${inv.currency} ${total.toLocaleString("en-IN")} [${inv.status}]`);

      if (inv.status === "paid" && inv.amount_paid > 0) {
        await db.collection("payments").add({
          company_id: companyId,
          invoice_id: ref.id,
          amount: inv.amount_paid,
          payment_date: inv.payment_date || inv.due_date,
          payment_mode: "bank_transfer",
          reference: "",
          notes: "Imported from PDF",
          created_at: new Date().toISOString(),
        });
        console.log(`    + payment ${inv.currency} ${inv.amount_paid.toLocaleString("en-IN")}`);
      }
    } else {
      console.log(`  → would create ${inv.invoice_number} — ${inv.currency} ${total.toLocaleString("en-IN")} [${inv.status}]`);
      if (inv.status === "paid" && inv.amount_paid > 0) {
        console.log(`    + would create payment ${inv.currency} ${inv.amount_paid.toLocaleString("en-IN")}`);
      }
    }
    imported++;
  }

  // 4. Bump invoice_next_number so manual creation continues at A0004
  console.log(`\n--- Updating invoice counter ---`);
  const desiredNext = 4;
  const currentNext = existing.invoice_next_number || 1;
  if (currentNext < desiredNext) {
    console.log(`  → invoice_next_number ${currentNext} → ${desiredNext}`);
    if (APPLY) {
      await companyDoc.ref.update({ invoice_next_number: desiredNext, invoice_prefix: "A" });
      console.log(`  ✓ updated`);
    }
  } else {
    console.log(`  ✓ invoice_next_number already at ${currentNext}`);
  }

  console.log(`\n=== ${APPLY ? "Done" : "Dry run done"} — imported: ${imported}, skipped: ${skipped} ===\n`);
  if (!APPLY) console.log(`Re-run with --apply to actually write.\n`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
