import { adminDb } from "./firebase-admin";

export async function getNextInvoiceNumber(companyId: string): Promise<string> {
  return adminDb.runTransaction(async (transaction) => {
    const companyRef = adminDb.collection("companies").doc(companyId);
    const companyDoc = await transaction.get(companyRef);

    const prefix = companyDoc.data()?.invoice_prefix || "A";
    let nextNum = companyDoc.data()?.invoice_next_number || 1;

    // Scope last-invoice lookup to this company so prefixes don't collide
    const lastInvoice = await adminDb.collection("invoices")
      .where("company_id", "==", companyId)
      .orderBy("created_at", "desc").limit(1).get();

    if (!lastInvoice.empty) {
      const lastNumber = lastInvoice.docs[0].data().invoice_number;
      const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
      const match = lastNumber?.match(re);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        if (lastNum >= nextNum) nextNum = lastNum + 1;
      }
    }

    const invoiceNumber = `${prefix}${String(nextNum).padStart(5, "0")}`;

    transaction.update(companyRef, { invoice_next_number: nextNum + 1 });

    return invoiceNumber;
  });
}
