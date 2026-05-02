/**
 * Turn on LUT for Flowstack (ARN AD3304260648504), and stamp existing
 * international invoices with place_of_supply + export_type + lut_arn so
 * historical PDFs render the LUT note.
 *
 * Idempotent.
 *
 * Usage:
 *   npx tsx scripts/backfill-lut.ts          # dry run
 *   npx tsx scripts/backfill-lut.ts --apply
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

const FLOWSTACK_LUT_ARN = "AD3304260648504";

(async () => {
  console.log(`\n=== LUT backfill (${APPLY ? "APPLY" : "DRY RUN"}) ===\n`);

  // 1. Find Flowstack and turn on LUT
  const compsSnap = await db.collection("companies").get();
  const flowstack = compsSnap.docs.find((d) =>
    (d.data().name || "").toLowerCase().includes("flowstack")
  );
  if (!flowstack) {
    console.error("✗ Flowstack company not found.");
    process.exit(1);
  }
  const fs_data = flowstack.data();
  const needsLut = !fs_data.lut_enabled || !fs_data.lut_arn;
  if (needsLut) {
    console.log(`→ Flowstack (${flowstack.id}): enable LUT, set ARN ${FLOWSTACK_LUT_ARN}`);
    if (APPLY) {
      await flowstack.ref.update({
        lut_enabled: true,
        lut_arn: FLOWSTACK_LUT_ARN,
      });
    }
  } else {
    console.log(`✓ Flowstack already has LUT enabled (ARN ${fs_data.lut_arn})`);
  }

  // 2. For every Flowstack invoice with an international client and no
  //    export_type set, fill in place_of_supply, export_type=lut, lut_arn.
  const invsSnap = await db.collection("invoices")
    .where("company_id", "==", flowstack.id).get();

  let stamped = 0;
  let skipped = 0;
  for (const invDoc of invsSnap.docs) {
    const inv = invDoc.data();
    if (inv.export_type) {
      skipped++;
      continue;
    }
    if (!inv.client_id) {
      skipped++;
      continue;
    }
    const clientDoc = await db.collection("clients").doc(inv.client_id).get();
    if (!clientDoc.exists) {
      skipped++;
      continue;
    }
    const client = clientDoc.data()!;

    const isInternational = !!client.is_international;
    const place_of_supply = isInternational ? client.country || "" : client.state || "";
    const export_type = isInternational ? "lut" : "";
    const lut_arn = isInternational ? FLOWSTACK_LUT_ARN : "";

    console.log(`→ ${inv.invoice_number}: place_of_supply="${place_of_supply}", export_type="${export_type}"${lut_arn ? ", lut_arn=" + lut_arn : ""}`);

    if (APPLY) {
      await invDoc.ref.update({
        place_of_supply,
        export_type,
        lut_arn,
      });
    }
    stamped++;
  }

  console.log(`\n=== ${APPLY ? "Done" : "Dry run done"} — stamped: ${stamped}, skipped: ${skipped} ===\n`);
  if (!APPLY) console.log(`Re-run with --apply to actually write.\n`);
})().catch((e) => { console.error(e); process.exit(1); });
