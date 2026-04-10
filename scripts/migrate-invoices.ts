/**
 * Migration script — imports real invoice data from PDFs into Firestore
 * Run: npx tsx scripts/migrate-invoices.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "../serviceAccountKey.json");

if (!fs.existsSync(saPath)) {
  console.error("Service account not found at:", saPath);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

async function migrate() {
  console.log("Migrating real invoice data...\n");

  // ── Company Settings ──
  await db.collection("company").doc("default").set({
    name: "Portx Infotech Private Limited",
    address: "Tamil Nadu, India",
    state: "Tamil Nadu",
    country: "India",
    gstin: "33AAKCP8879K1ZK",
    pan: "AAKCP8879K",
    hsn_code: "9983",
    bank_name: "KVB",
    account_name: "Portx Infotech Private Limited",
    account_number: "1748149000000020",
    ifsc: "KVBL0001748",
    swift_code: "KVBLINBBXXX",
    logo_path: "",
    email: "",
    phone: "",
    cin: "",
    invoice_prefix: "A",
    invoice_next_number: 12,
  });
  console.log("  ✓ Company settings");

  // ── Clients ──
  // Client 1: TEKFILO INNOVATIONS PRIVATE LIMITED (domestic - Tamil Nadu)
  const client1Ref = await db.collection("clients").add({
    name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
    address: "Tamil Nadu, India",
    state: "Tamil Nadu",
    country: "India",
    gstin: "33AAJCT0976A1ZK",
    pan: "AAJCT0976A",
    currency: "INR",
    is_international: false,
  });
  console.log("  ✓ Client: TEKFILO INNOVATIONS PRIVATE LIMITED");

  // Client 2: TEKFILO INNOVATIONS LIMITED (international - Hong Kong)
  const client2Ref = await db.collection("clients").add({
    name: "TEKFILO INNOVATIONS LIMITED",
    address: "UNIT 1324, 13/F BEVERLEY COMMERCIAL CENTER, CTR 87-105, CHATHAM ROAD SOUTH TSIM SHA TSUI, KOWLOON, Hong Kong",
    state: "",
    country: "Hong Kong",
    gstin: "",
    pan: "",
    currency: "USD",
    is_international: true,
  });
  console.log("  ✓ Client: TEKFILO INNOVATIONS LIMITED");

  const client1Id = client1Ref.id;
  const client2Id = client2Ref.id;

  // ── Invoices ──
  const invoices = [
    // A00001 - Domestic, PAID
    {
      invoice_number: "A00001",
      invoice_date: "2025-09-01",
      due_date: "2025-09-16",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 350000,
      cgst: 31500,
      sgst: 31500,
      igst: 0,
      total: 413000,
      status: "paid",
      amount_paid: 413000,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 350000, gst_rate: 18, amount: 350000 },
      ],
      created_at: "2025-09-01T10:00:00Z",
      updated_at: "2025-09-01T10:00:00Z",
    },
    // A00002 - Domestic, PAID
    {
      invoice_number: "A00002",
      invoice_date: "2025-09-30",
      due_date: "2025-10-07",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 350000,
      cgst: 31500,
      sgst: 31500,
      igst: 0,
      total: 413000,
      status: "paid",
      amount_paid: 413000,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 350000, gst_rate: 18, amount: 350000 },
      ],
      created_at: "2025-09-30T10:00:00Z",
      updated_at: "2025-09-30T10:00:00Z",
    },
    // A00003 - Domestic, sent (no "Paid" label in PDF)
    {
      invoice_number: "A00003",
      invoice_date: "2025-11-03",
      due_date: "2025-11-18",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 350000,
      cgst: 31500,
      sgst: 31500,
      igst: 0,
      total: 413000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "HR Consulting", quantity: 1, rate: 350000, gst_rate: 18, amount: 350000 },
      ],
      created_at: "2025-11-03T10:00:00Z",
      updated_at: "2025-11-03T10:00:00Z",
    },
    // A00004 - International (Hong Kong), USD
    {
      invoice_number: "A00004",
      invoice_date: "2025-11-07",
      due_date: "2025-11-22",
      client_id: client2Id,
      client_name: "TEKFILO INNOVATIONS LIMITED",
      currency: "USD",
      hsn_code: "9983",
      subtotal: 3400,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 3400,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 3400, gst_rate: 0, amount: 3400 },
      ],
      created_at: "2025-11-07T10:00:00Z",
      updated_at: "2025-11-07T10:00:00Z",
    },
    // A00005 - International (Hong Kong), USD
    {
      invoice_number: "A00005",
      invoice_date: "2025-12-03",
      due_date: "2025-12-18",
      client_id: client2Id,
      client_name: "TEKFILO INNOVATIONS LIMITED",
      currency: "USD",
      hsn_code: "9983",
      subtotal: 3400,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 3400,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 3400, gst_rate: 0, amount: 3400 },
      ],
      created_at: "2025-12-03T10:00:00Z",
      updated_at: "2025-12-03T10:00:00Z",
    },
    // A00006 - Domestic, HR Consulting
    {
      invoice_number: "A00006",
      invoice_date: "2025-12-03",
      due_date: "2025-12-18",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 350000,
      cgst: 31500,
      sgst: 31500,
      igst: 0,
      total: 413000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "HR Consulting", quantity: 1, rate: 350000, gst_rate: 18, amount: 350000 },
      ],
      created_at: "2025-12-03T10:00:00Z",
      updated_at: "2025-12-03T10:00:00Z",
    },
    // A00007 - Domestic, HR Consulting, ₹50,000
    {
      invoice_number: "A00007",
      invoice_date: "2026-01-03",
      due_date: "2026-01-18",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      total: 59000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "HR Consulting", quantity: 1, rate: 50000, gst_rate: 18, amount: 50000 },
      ],
      created_at: "2026-01-03T10:00:00Z",
      updated_at: "2026-01-03T10:00:00Z",
    },
    // A00008 - International (Hong Kong), USD $1,700
    {
      invoice_number: "A00008",
      invoice_date: "2026-02-03",
      due_date: "2026-02-18",
      client_id: client2Id,
      client_name: "TEKFILO INNOVATIONS LIMITED",
      currency: "USD",
      hsn_code: "9983",
      subtotal: 1700,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 1700,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 1700, gst_rate: 0, amount: 1700 },
      ],
      created_at: "2026-02-03T10:00:00Z",
      updated_at: "2026-02-03T10:00:00Z",
    },
    // A00009 - Domestic, software consultancy, ₹50,000
    {
      invoice_number: "A00009",
      invoice_date: "2026-02-05",
      due_date: "2026-02-20",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      total: 59000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 50000, gst_rate: 18, amount: 50000 },
      ],
      created_at: "2026-02-05T10:00:00Z",
      updated_at: "2026-02-05T10:00:00Z",
    },
    // A00010 - Domestic, HR Consulting, ₹50,000
    {
      invoice_number: "A00010",
      invoice_date: "2026-03-05",
      due_date: "2026-03-20",
      client_id: client1Id,
      client_name: "TEKFILO INNOVATIONS PRIVATE LIMITED",
      currency: "INR",
      hsn_code: "9983",
      subtotal: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      total: 59000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "HR Consulting", quantity: 1, rate: 50000, gst_rate: 18, amount: 50000 },
      ],
      created_at: "2026-03-05T10:00:00Z",
      updated_at: "2026-03-05T10:00:00Z",
    },
    // A00011 - International (Hong Kong), USD $3,300
    {
      invoice_number: "A00011",
      invoice_date: "2026-03-12",
      due_date: "2026-03-27",
      client_id: client2Id,
      client_name: "TEKFILO INNOVATIONS LIMITED",
      currency: "USD",
      hsn_code: "9983",
      subtotal: 3300,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 3300,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "software consultancy services", quantity: 1, rate: 3300, gst_rate: 0, amount: 3300 },
      ],
      created_at: "2026-03-12T10:00:00Z",
      updated_at: "2026-03-12T10:00:00Z",
    },
  ];

  for (const inv of invoices) {
    await db.collection("invoices").add(inv);
    console.log(`  ✓ Invoice: ${inv.invoice_number} - ${inv.client_name} (${inv.currency} ${inv.total}) [${inv.status}]`);
  }

  console.log("\n✅ Migration complete!");
  console.log(`   1 company profile`);
  console.log(`   2 clients`);
  console.log(`   ${invoices.length} invoices`);
  console.log(`   Next invoice number set to: A00012`);

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
