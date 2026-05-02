import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const sa = JSON.parse(fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

(async () => {
  const snap = await db.collection("companies").get();
  const fs_doc = snap.docs.find((d) => (d.data().name || "").toLowerCase().includes("flowstack"));
  if (!fs_doc) return;
  const accs = (fs_doc.data().bank_accounts || []) as any[];
  console.log(JSON.stringify(accs, null, 2));
})();
