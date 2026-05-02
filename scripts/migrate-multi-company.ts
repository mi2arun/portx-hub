/**
 * Multi-company migration.
 *
 *  Migrates: company/default (single doc)  →  companies/{auto-id} (collection)
 *  Backfills company_id on every doc in clients, invoices, expenses, documents, payments.
 *  Seeds a second blank company "Flowstack Technologies Private Limited".
 *  Deletes the old company/default doc.
 *
 *  Idempotent: re-running after success is a no-op (skips if companies/* already exists
 *  and old doc is gone).
 *
 *  Usage:
 *    npx tsx scripts/migrate-multi-company.ts          # dry run (default)
 *    npx tsx scripts/migrate-multi-company.ts --apply  # actually write
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const APPLY = process.argv.includes("--apply");

const saPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "../serviceAccountKey.json");

if (!fs.existsSync(saPath)) {
  console.error("Service account not found at:", saPath);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

const PORTX_DEFAULTS = {
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
  fy_start_month: 4,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
};

const FLOWSTACK_DEFAULTS = {
  name: "Flowstack Technologies Private Limited",
  address: "",
  state: "",
  country: "India",
  gstin: "",
  pan: "",
  hsn_code: "",
  bank_name: "",
  account_name: "",
  account_number: "",
  ifsc: "",
  swift_code: "",
  logo_path: "/portx-logo.png",
  email: "",
  phone: "",
  cin: "",
  invoice_prefix: "F",
  invoice_next_number: 1,
  fy_start_month: 4,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from_email: "",
  smtp_from_name: "",
};

const DATA_COLLECTIONS = ["clients", "invoices", "expenses", "documents", "payments"];

async function migrate() {
  console.log(`\n=== Multi-company migration (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  // 1. Read existing company/default
  const oldDoc = await db.collection("company").doc("default").get();
  const oldData = oldDoc.exists ? { ...PORTX_DEFAULTS, ...oldDoc.data() } : { ...PORTX_DEFAULTS };

  if (oldDoc.exists) {
    console.log(`✓ Found existing company/default — name: "${oldData.name}"`);
  } else {
    console.log(`! No company/default doc found — using built-in defaults for Portx`);
  }

  // 2. Check if migration has already run
  const existingCompanies = await db.collection("companies").get();
  let portxId: string;
  let flowstackId: string | null = null;

  if (existingCompanies.empty) {
    portxId = APPLY ? db.collection("companies").doc().id : "<portx-new-id>";
    flowstackId = APPLY ? db.collection("companies").doc().id : "<flowstack-new-id>";
    console.log(`→ Will create companies/${portxId}  ("${oldData.name}")`);
    console.log(`→ Will create companies/${flowstackId} ("${FLOWSTACK_DEFAULTS.name}")`);

    if (APPLY) {
      // Don't write invoice_next_number from old doc as-is — keep what was there
      await db.collection("companies").doc(portxId).set(oldData);
      await db.collection("companies").doc(flowstackId).set(FLOWSTACK_DEFAULTS);
    }
  } else {
    // Find Portx (or first company) to use as the backfill target
    const portxMatch = existingCompanies.docs.find(
      (d) => (d.data().name || "").toLowerCase().includes("portx")
    );
    const target = portxMatch || existingCompanies.docs[0];
    portxId = target.id;
    console.log(`✓ companies/* already has ${existingCompanies.size} doc(s); using ${portxId} ("${target.data().name}") as backfill target`);

    const flowstackMatch = existingCompanies.docs.find(
      (d) => (d.data().name || "").toLowerCase().includes("flowstack")
    );
    if (!flowstackMatch) {
      flowstackId = APPLY ? db.collection("companies").doc().id : "<flowstack-new-id>";
      console.log(`→ Will create Flowstack at companies/${flowstackId}`);
      if (APPLY) {
        await db.collection("companies").doc(flowstackId).set(FLOWSTACK_DEFAULTS);
      }
    } else {
      flowstackId = flowstackMatch.id;
      console.log(`✓ Flowstack already exists at companies/${flowstackId}`);
    }
  }

  // 3. Backfill company_id on every collection
  console.log(`\n--- Backfilling company_id = ${portxId} ---`);
  for (const col of DATA_COLLECTIONS) {
    const snap = await db.collection(col).get();
    let needs = 0;
    let already = 0;
    for (const doc of snap.docs) {
      if (doc.data().company_id) already++;
      else needs++;
    }
    console.log(`  ${col}: ${snap.size} total, ${already} already stamped, ${needs} need backfill`);

    if (APPLY && needs > 0) {
      // Batch in chunks of 400 (Firestore batch limit is 500)
      let batch = db.batch();
      let count = 0;
      for (const doc of snap.docs) {
        if (!doc.data().company_id) {
          batch.update(doc.ref, { company_id: portxId });
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }
      if (count % 400 !== 0) await batch.commit();
      console.log(`    ✓ wrote ${count} updates`);
    }
  }

  // 4. Delete the old company/default doc
  if (oldDoc.exists) {
    console.log(`\n--- Deleting old company/default ---`);
    if (APPLY) {
      await db.collection("company").doc("default").delete();
      console.log(`  ✓ deleted`);
    } else {
      console.log(`  → would delete (dry run)`);
    }
  }

  console.log(`\n=== Done${APPLY ? "" : " (dry run — no writes performed)"} ===\n`);
  if (!APPLY) {
    console.log(`Re-run with --apply to actually migrate.\n`);
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
