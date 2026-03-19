/**
 * Seed script — adds sample data to Firestore
 * Run: npx tsx scripts/seed.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Load service account
const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(process.env.HOME || "", "Downloads/portxhub-firebase-adminsdk-fbsvc-cedead38d2.json");

if (!fs.existsSync(saPath)) {
  console.error("Service account not found at:", saPath);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

async function seed() {
  console.log("Seeding sample data...\n");

  // ── Clients ──
  const clients = [
    {
      name: "Tekfilo Solutions Pvt Ltd",
      address: "42, Anna Salai, T. Nagar, Chennai - 600017, Tamil Nadu, India",
      state: "Tamil Nadu",
      country: "India",
      gstin: "33AABCT1234F1ZN",
      pan: "AABCT1234F",
      currency: "INR",
      is_international: false,
    },
    {
      name: "Nexora Technologies",
      address: "Tower B, 5th Floor, Cyber City, Gurugram - 122002, Haryana, India",
      state: "Haryana",
      country: "India",
      gstin: "06AABCN5678G1ZQ",
      pan: "AABCN5678G",
      currency: "INR",
      is_international: false,
    },
    {
      name: "CloudBridge Inc.",
      address: "350 Fifth Avenue, Suite 4810, New York, NY 10118, USA",
      state: "",
      country: "United States",
      gstin: "",
      pan: "",
      currency: "USD",
      is_international: true,
    },
    {
      name: "DataWave GmbH",
      address: "Friedrichstraße 123, 10117 Berlin, Germany",
      state: "",
      country: "Germany",
      gstin: "",
      pan: "",
      currency: "EUR",
      is_international: true,
    },
    {
      name: "Meridian Infotech",
      address: "12/A, MG Road, Koramangala, Bangalore - 560034, Karnataka, India",
      state: "Karnataka",
      country: "India",
      gstin: "29AABCM9012H1ZR",
      pan: "AABCM9012H",
      currency: "INR",
      is_international: false,
    },
  ];

  const clientIds: string[] = [];
  for (const client of clients) {
    const ref = await db.collection("clients").add(client);
    clientIds.push(ref.id);
    console.log(`  ✓ Client: ${client.name}`);
  }

  // ── Invoices ──
  const invoices = [
    {
      invoice_number: "A00001",
      invoice_date: "2026-01-15",
      due_date: "2026-02-14",
      client_id: clientIds[0], // Tekfilo - same state (TN)
      client_name: "Tekfilo Solutions Pvt Ltd",
      currency: "INR",
      hsn_code: "998314",
      subtotal: 150000,
      cgst: 13500,
      sgst: 13500,
      igst: 0,
      total: 177000,
      status: "paid",
      amount_paid: 177000,
      items: [
        { description: "Web Application Development - Phase 1", quantity: 1, rate: 100000, gst_rate: 18, amount: 100000 },
        { description: "UI/UX Design Services", quantity: 1, rate: 50000, gst_rate: 18, amount: 50000 },
      ],
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-02-10T10:00:00Z",
    },
    {
      invoice_number: "A00002",
      invoice_date: "2026-02-01",
      due_date: "2026-03-03",
      client_id: clientIds[1], // Nexora - different state (Haryana)
      client_name: "Nexora Technologies",
      currency: "INR",
      hsn_code: "998314",
      subtotal: 250000,
      cgst: 0,
      sgst: 0,
      igst: 45000,
      total: 295000,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "Cloud Migration Consulting", quantity: 40, rate: 5000, gst_rate: 18, amount: 200000 },
        { description: "DevOps Setup & Configuration", quantity: 1, rate: 50000, gst_rate: 18, amount: 50000 },
      ],
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "2026-02-01T10:00:00Z",
    },
    {
      invoice_number: "A00003",
      invoice_date: "2026-02-15",
      due_date: "2026-03-17",
      client_id: clientIds[2], // CloudBridge - international USD
      client_name: "CloudBridge Inc.",
      currency: "USD",
      hsn_code: "998314",
      subtotal: 5000,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 5000,
      status: "partially_paid",
      amount_paid: 2500,
      items: [
        { description: "API Integration Development", quantity: 50, rate: 80, gst_rate: 0, amount: 4000 },
        { description: "Technical Documentation", quantity: 10, rate: 100, gst_rate: 0, amount: 1000 },
      ],
      created_at: "2026-02-15T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    {
      invoice_number: "A00004",
      invoice_date: "2026-03-01",
      due_date: "2026-03-31",
      client_id: clientIds[3], // DataWave - international EUR
      client_name: "DataWave GmbH",
      currency: "EUR",
      hsn_code: "998314",
      subtotal: 8500,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 8500,
      status: "sent",
      amount_paid: 0,
      items: [
        { description: "Data Pipeline Architecture & Development", quantity: 1, rate: 6000, gst_rate: 0, amount: 6000 },
        { description: "Monthly Support & Maintenance - March", quantity: 1, rate: 2500, gst_rate: 0, amount: 2500 },
      ],
      created_at: "2026-03-01T10:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
    },
    {
      invoice_number: "A00005",
      invoice_date: "2026-03-10",
      due_date: "2026-04-09",
      client_id: clientIds[4], // Meridian - different state (Karnataka)
      client_name: "Meridian Infotech",
      currency: "INR",
      hsn_code: "998314",
      subtotal: 75000,
      cgst: 0,
      sgst: 0,
      igst: 13500,
      total: 88500,
      status: "draft",
      amount_paid: 0,
      items: [
        { description: "Mobile App Development - React Native", quantity: 1, rate: 75000, gst_rate: 18, amount: 75000 },
      ],
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
    },
  ];

  const invoiceIds: string[] = [];
  for (const inv of invoices) {
    const ref = await db.collection("invoices").add(inv);
    invoiceIds.push(ref.id);
    console.log(`  ✓ Invoice: ${inv.invoice_number} - ${inv.client_name} (${inv.status})`);
  }

  // ── Payments ──
  const payments = [
    {
      invoice_id: invoiceIds[0], // A00001 - fully paid
      amount: 177000,
      payment_date: "2026-02-10",
      payment_mode: "bank_transfer",
      reference: "UTR2026021098765",
      notes: "Full payment received",
      created_at: "2026-02-10T10:00:00Z",
    },
    {
      invoice_id: invoiceIds[2], // A00003 - partial payment
      amount: 2500,
      payment_date: "2026-03-01",
      payment_mode: "bank_transfer",
      reference: "WIRE-CB-20260301",
      notes: "First installment",
      created_at: "2026-03-01T10:00:00Z",
    },
  ];

  for (const pay of payments) {
    await db.collection("payments").add(pay);
    console.log(`  ✓ Payment: ${pay.amount} for invoice ${pay.invoice_id.slice(0, 8)}...`);
  }

  // ── Expenses ──
  const expenses = [
    {
      date: "2026-01-05",
      amount: 15000,
      category: "Office Rent & Utilities",
      vendor: "Kamaraj Properties",
      description: "Office rent - January 2026",
      payment_mode: "bank_transfer",
      reference: "RENT-JAN-2026",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: true,
      created_at: "2026-01-05T10:00:00Z",
    },
    {
      date: "2026-01-10",
      amount: 12500,
      category: "Cloud Services & Hosting",
      vendor: "Amazon Web Services",
      description: "AWS monthly bill - December 2025",
      payment_mode: "credit_card",
      reference: "INV-AWS-DEC25",
      gst_amount: 2250,
      vendor_gstin: "29AABCA0123B1ZP",
      is_recurring: true,
      created_at: "2026-01-10T10:00:00Z",
    },
    {
      date: "2026-01-15",
      amount: 4200,
      category: "Software Subscriptions",
      vendor: "GitHub",
      description: "GitHub Team plan - 6 users",
      payment_mode: "credit_card",
      reference: "GH-2026-01",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: true,
      created_at: "2026-01-15T10:00:00Z",
    },
    {
      date: "2026-01-20",
      amount: 1800,
      category: "Internet & Telecom",
      vendor: "Airtel Business",
      description: "Office broadband - 100 Mbps",
      payment_mode: "upi",
      reference: "AIRTEL-JAN26",
      gst_amount: 324,
      vendor_gstin: "33AABCA5678C1ZQ",
      is_recurring: true,
      created_at: "2026-01-20T10:00:00Z",
    },
    {
      date: "2026-02-01",
      amount: 15000,
      category: "Office Rent & Utilities",
      vendor: "Kamaraj Properties",
      description: "Office rent - February 2026",
      payment_mode: "bank_transfer",
      reference: "RENT-FEB-2026",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: true,
      created_at: "2026-02-01T10:00:00Z",
    },
    {
      date: "2026-02-05",
      amount: 35000,
      category: "Professional Fees",
      vendor: "KR & Associates",
      description: "CA fees - GST filing & tax advisory Q3",
      payment_mode: "bank_transfer",
      reference: "KR-INV-2026-Q3",
      gst_amount: 6300,
      vendor_gstin: "33AABCK9876D1ZR",
      is_recurring: false,
      created_at: "2026-02-05T10:00:00Z",
    },
    {
      date: "2026-02-10",
      amount: 14800,
      category: "Cloud Services & Hosting",
      vendor: "Amazon Web Services",
      description: "AWS monthly bill - January 2026",
      payment_mode: "credit_card",
      reference: "INV-AWS-JAN26",
      gst_amount: 2664,
      vendor_gstin: "29AABCA0123B1ZP",
      is_recurring: true,
      created_at: "2026-02-10T10:00:00Z",
    },
    {
      date: "2026-02-15",
      amount: 8500,
      category: "Software Subscriptions",
      vendor: "Figma",
      description: "Figma Professional - annual plan",
      payment_mode: "credit_card",
      reference: "FIGMA-2026",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: false,
      created_at: "2026-02-15T10:00:00Z",
    },
    {
      date: "2026-02-20",
      amount: 4500,
      category: "Travel & Conveyance",
      vendor: "MakeMyTrip",
      description: "Flight to Bangalore - client meeting (Meridian)",
      payment_mode: "credit_card",
      reference: "MMT-BLR-FEB26",
      gst_amount: 810,
      vendor_gstin: "06AABCM1234E1ZS",
      is_recurring: false,
      created_at: "2026-02-20T10:00:00Z",
    },
    {
      date: "2026-03-01",
      amount: 15000,
      category: "Office Rent & Utilities",
      vendor: "Kamaraj Properties",
      description: "Office rent - March 2026",
      payment_mode: "bank_transfer",
      reference: "RENT-MAR-2026",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: true,
      created_at: "2026-03-01T10:00:00Z",
    },
    {
      date: "2026-03-05",
      amount: 2400,
      category: "Food & Beverages",
      vendor: "Zomato for Business",
      description: "Team lunch - project completion celebration",
      payment_mode: "upi",
      reference: "ZOM-MAR05",
      gst_amount: 120,
      vendor_gstin: "",
      is_recurring: false,
      created_at: "2026-03-05T10:00:00Z",
    },
    {
      date: "2026-03-10",
      amount: 65000,
      category: "Hardware & Equipment",
      vendor: "Dell Technologies",
      description: "Dell Latitude 5540 laptop - new developer",
      payment_mode: "bank_transfer",
      reference: "DELL-INV-2026-0342",
      gst_amount: 11700,
      vendor_gstin: "36AABCD1234F1ZT",
      is_recurring: false,
      created_at: "2026-03-10T10:00:00Z",
    },
    {
      date: "2026-03-12",
      amount: 3500,
      category: "Marketing & Advertising",
      vendor: "Google Ads",
      description: "Google Ads campaign - March",
      payment_mode: "credit_card",
      reference: "GADS-MAR26",
      gst_amount: 630,
      vendor_gstin: "",
      is_recurring: true,
      created_at: "2026-03-12T10:00:00Z",
    },
    {
      date: "2026-03-15",
      amount: 5000,
      category: "Training & Courses",
      vendor: "Udemy Business",
      description: "Annual team learning subscription",
      payment_mode: "credit_card",
      reference: "UDEMY-2026",
      gst_amount: 0,
      vendor_gstin: "",
      is_recurring: false,
      created_at: "2026-03-15T10:00:00Z",
    },
  ];

  for (const exp of expenses) {
    await db.collection("expenses").add(exp);
    console.log(`  ✓ Expense: ${exp.date} - ${exp.vendor} - ₹${exp.amount}`);
  }

  // Update company invoice_next_number
  await db.collection("company").doc("default").update({
    invoice_next_number: 6,
  });

  console.log("\n✅ Seed complete!");
  console.log(`   ${clients.length} clients`);
  console.log(`   ${invoices.length} invoices`);
  console.log(`   ${payments.length} payments`);
  console.log(`   ${expenses.length} expenses`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
