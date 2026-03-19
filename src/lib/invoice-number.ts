import { adminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function getNextInvoiceNumber(): Promise<string> {
  // Use a transaction to atomically read and increment the invoice number
  return adminDb.runTransaction(async (transaction) => {
    const companyRef = adminDb.collection("company").doc("default");
    const companyDoc = await transaction.get(companyRef);

    const prefix = companyDoc.data()?.invoice_prefix || "A";
    let nextNum = companyDoc.data()?.invoice_next_number || 1;

    // Also check the last invoice to prevent duplicates
    const lastInvoice = await adminDb.collection("invoices")
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

    // Update the next number
    transaction.update(companyRef, { invoice_next_number: nextNum + 1 });

    return invoiceNumber;
  });
}
