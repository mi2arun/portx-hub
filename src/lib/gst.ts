export type GstType = "igst" | "cgst_sgst" | "none";
export type ExportType = "lut" | "with_tax" | "";

/**
 * Resolve which GST type applies on an invoice.
 *
 *  Domestic intra-state → CGST + SGST
 *  Domestic inter-state → IGST
 *  Export under LUT     → none (zero-rated without payment, mention LUT)
 *  Export with payment  → IGST (zero-rated with payment, refundable)
 */
export function getGstType(
  isInternational: boolean,
  clientState: string,
  companyState: string,
  exportType: ExportType = ""
): GstType {
  if (isInternational) {
    if (exportType === "with_tax") return "igst";
    // default for export = LUT (no tax). Caller should ensure LUT is configured.
    return "none";
  }
  if (clientState.toLowerCase() === companyState.toLowerCase()) return "cgst_sgst";
  return "igst";
}

export function calculateGst(
  subtotal: number,
  gstRate: number,
  gstType: GstType
): { cgst: number; sgst: number; igst: number; total: number } {
  if (gstType === "none") {
    return { cgst: 0, sgst: 0, igst: 0, total: subtotal };
  }

  const taxAmount = subtotal * (gstRate / 100);

  if (gstType === "cgst_sgst") {
    const half = Math.round((taxAmount / 2) * 100) / 100;
    return { cgst: half, sgst: half, igst: 0, total: subtotal + half * 2 };
  }

  // IGST
  const igst = Math.round(taxAmount * 100) / 100;
  return { cgst: 0, sgst: 0, igst, total: subtotal + igst };
}

export function calculateItemTotals(
  items: { quantity: number; rate: number; gst_rate: number }[],
  gstType: GstType
) {
  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const item of items) {
    const amount = item.quantity * item.rate;
    subtotal += amount;
    const gst = calculateGst(amount, item.gst_rate, gstType);
    totalCgst += gst.cgst;
    totalSgst += gst.sgst;
    totalIgst += gst.igst;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  totalCgst = Math.round(totalCgst * 100) / 100;
  totalSgst = Math.round(totalSgst * 100) / 100;
  totalIgst = Math.round(totalIgst * 100) / 100;
  const total = Math.round((subtotal + totalCgst + totalSgst + totalIgst) * 100) / 100;

  return { subtotal, cgst: totalCgst, sgst: totalSgst, igst: totalIgst, total };
}
