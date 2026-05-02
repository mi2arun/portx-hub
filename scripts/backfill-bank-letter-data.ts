/**
 * Stamps Flowstack with the data shown on the sample vendor-registration
 * bank-letter PDF: ICICI bank branch address, EUR account, signatory,
 * place of signing, website, CIN.
 *
 * Idempotent — uses field-level merges and won't clobber non-blank values.
 *
 * Usage:
 *   npx tsx scripts/backfill-bank-letter-data.ts          # dry run
 *   npx tsx scripts/backfill-bank-letter-data.ts --apply
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

const ICICI_BRANCH_ADDRESS =
  "Aishwarya Commercial Center, T V Samy Road, R S Puram, Coimbatore - 641002, TamilNadu, India";

(async () => {
  console.log(`\n=== Bank-letter backfill (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  const snap = await db.collection("companies").get();
  const flowstack = snap.docs.find((d) =>
    (d.data().name || "").toLowerCase().includes("flowstack")
  );
  if (!flowstack) {
    console.error("✗ Flowstack not found");
    process.exit(1);
  }
  const company = flowstack.data();
  console.log(`✓ Flowstack: ${flowstack.id}`);

  // 1. Company-level fills (only blank fields)
  const wantCompany = {
    cin: "U62099TZ2025PTC034988",
    email: company.email || "contact@flowstacktechnologies.com",
    website: "www.flowstacktechnologies.com",
    signatory_name: "S Arunkumar",
    signatory_designation: "Executive Director",
    place_of_signing: "Coimbatore",
  };
  const companyUpdates: Record<string, string> = {};
  for (const [k, v] of Object.entries(wantCompany)) {
    if (!company[k] || company[k] === "") companyUpdates[k] = v;
  }
  if (Object.keys(companyUpdates).length === 0) {
    console.log("  ✓ company fields already set");
  } else {
    console.log(`  → company fills: ${Object.keys(companyUpdates).join(", ")}`);
    if (APPLY) await flowstack.ref.update(companyUpdates);
  }

  // Bank-account level: only fill bank_address if the existing account doesn't have one,
  // since the user is managing accounts via the UI. Don't add/remove or change currencies.
  const accounts: Record<string, unknown>[] = Array.isArray(company.bank_accounts)
    ? company.bank_accounts.map((a: Record<string, unknown>) => ({ ...a }))
    : [];
  let bankTouched = false;
  for (const a of accounts) {
    if (!a.bank_address) {
      // Pick a sensible default: Coimbatore branch for ICICI Coimbatore SWIFT, else leave blank
      const swift = ((a.swift_code as string) || "").toUpperCase();
      const bank = ((a.beneficiary_bank as string) || "").toLowerCase();
      if (bank.includes("icici") && (swift === "ICICINBBCTS" || swift === "")) {
        a.bank_address = ICICI_BRANCH_ADDRESS;
        bankTouched = true;
        console.log(`  → ${a.id} (${a.currency}): filled bank_address (Coimbatore)`);
      }
    }
  }
  if (!bankTouched) console.log(`  ✓ bank accounts already have addresses (or no auto-fill applies)`);
  if (APPLY && bankTouched) {
    await flowstack.ref.update({ bank_accounts: accounts });
  }

  console.log(`\n=== ${APPLY ? "Done" : "Dry run done"} ===\n`);
  if (!APPLY) console.log(`Re-run with --apply to actually write.\n`);
})().catch((e) => { console.error(e); process.exit(1); });
