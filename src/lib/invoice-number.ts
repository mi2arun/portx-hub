import { adminDb } from "./firebase-admin";

export async function getNextInvoiceNumber(companyId: string): Promise<string> {
  return adminDb.runTransaction(async (transaction) => {
    const companyRef = adminDb.collection("companies").doc(companyId);
    const companyDoc = await transaction.get(companyRef);

    const prefix = companyDoc.data()?.invoice_prefix || "A";
    let nextNum = companyDoc.data()?.invoice_next_number || 1;

    // Scope to this company; sort in memory to avoid needing a composite index
    // on (company_id, created_at).
    const companyInvoices = await adminDb.collection("invoices")
      .where("company_id", "==", companyId).get();

    if (!companyInvoices.empty) {
      const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
      let maxNum = 0;
      for (const doc of companyInvoices.docs) {
        const m = (doc.data().invoice_number || "").match(re);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      if (maxNum >= nextNum) nextNum = maxNum + 1;
    }

    const invoiceNumber = `${prefix}${String(nextNum).padStart(5, "0")}`;

    transaction.update(companyRef, { invoice_next_number: nextNum + 1 });

    return invoiceNumber;
  });
}
