import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

(async () => {
  const snap = await db.collection("invoices").where("invoice_number", "==", "A0003").get();
  for (const d of snap.docs) {
    const cur = d.data().po_reference;
    if (cur) { console.log(`A0003 (${d.id}) already has po_reference="${cur}", skipping`); continue; }
    console.log(`${APPLY ? "→" : "would"} set A0003 (${d.id}) po_reference = "PO/45624"`);
    if (APPLY) await d.ref.update({ po_reference: "PO/45624" });
  }
})();
