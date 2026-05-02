/**
 * For every company with legacy bank fields (bank_name etc.) but no bank_accounts
 * array, create one BankAccount entry from the legacy fields.
 *
 * Idempotent: skips companies that already have bank_accounts populated.
 *
 * Usage:
 *   npx tsx scripts/migrate-bank-accounts.ts          # dry run
 *   npx tsx scripts/migrate-bank-accounts.ts --apply
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const APPLY = process.argv.includes("--apply");

const sa = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8")
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

(async () => {
  console.log(`\n=== Bank-accounts migration (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);
  const snap = await db.collection("companies").get();
  let migrated = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const existing = data.bank_accounts as unknown[] | undefined;
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`  - ${d.id} (${data.name}) — already has ${existing.length} bank account(s), skipping`);
      skipped++;
      continue;
    }

    const hasLegacy = data.bank_name || data.account_name || data.account_number;
    if (!hasLegacy) {
      console.log(`  - ${d.id} (${data.name}) — no legacy bank fields, skipping`);
      skipped++;
      continue;
    }

    // Default currency from country (India → INR; everything else falls through to "")
    const currency = (data.country || "").toLowerCase() === "india" ? "INR" : "";

    const account = {
      id: crypto.randomBytes(8).toString("hex"),
      label: "Primary",
      currency,
      beneficiary_bank: data.bank_name || "",
      beneficiary_account_name: data.account_name || "",
      beneficiary_account_number: data.account_number || "",
      ifsc: data.ifsc || "",
      swift_code: data.swift_code || "",
      is_primary: true,
    };

    console.log(`  → ${d.id} (${data.name}) — will create entry: ${account.beneficiary_bank} / ${account.beneficiary_account_number} [${account.currency || "any"}]`);

    if (APPLY) {
      await d.ref.update({ bank_accounts: [account] });
    }
    migrated++;
  }

  console.log(`\n=== ${APPLY ? "Done" : "Dry run done"} — migrated: ${migrated}, skipped: ${skipped} ===\n`);
  if (!APPLY) console.log(`Re-run with --apply to actually write.\n`);
})().catch((e) => { console.error(e); process.exit(1); });
