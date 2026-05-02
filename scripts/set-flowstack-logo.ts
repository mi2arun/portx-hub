import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const sa = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8")
);
initializeApp({ credential: cert(sa) });
const db = getFirestore();

(async () => {
  const snap = await db.collection("companies").get();
  for (const d of snap.docs) {
    const name = (d.data().name || "").toLowerCase();
    if (name.includes("flowstack")) {
      await d.ref.update({ logo_path: "/flowstack-logo.png" });
      console.log(`✓ Set logo_path for ${d.id} (${d.data().name}) → /flowstack-logo.png`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
