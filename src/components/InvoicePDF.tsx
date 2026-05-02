"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { numberToWords } from "@/lib/amount-to-words";

const brand = "#7c3aed";
const brandLight = "#f5f3ff";
const gray = "#6b7280";
const grayLight = "#f9fafb";
const border = "#e5e7eb";
const dark = "#111827";

const s = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: dark,
  },
  // Header
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: brand,
  },
  headerLeft: {},
  headerRight: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 22, fontWeight: "bold", color: brand, letterSpacing: 1 },
  invoiceNum: { fontSize: 11, fontWeight: "bold", color: dark, marginTop: 4 },
  companyName: { fontSize: 10, fontWeight: "bold", color: dark },
  companyDetail: { fontSize: 8, color: gray, marginTop: 1 },

  // Meta grid
  metaGrid: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 0,
  },
  metaBox: {
    flex: 1,
    backgroundColor: grayLight,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: border,
  },
  metaBoxLast: {
    flex: 1,
    backgroundColor: grayLight,
    padding: 10,
  },
  metaLabel: { fontSize: 7, color: gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  metaValue: { fontSize: 9, fontWeight: "bold", color: dark },

  // Billing
  billingRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
  billingBox: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 4,
  },
  billingTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: brand,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: brandLight,
  },
  billingName: { fontSize: 10, fontWeight: "bold", marginBottom: 3 },
  billingText: { fontSize: 8, color: gray, lineHeight: 1.5 },

  // Table
  table: { marginBottom: 16 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: brand,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  tableHeadText: { color: "white", fontSize: 7, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: border,
  },
  tableRowAlt: { backgroundColor: "#faf5ff" },
  colNum: { width: 22 },
  colDesc: { flex: 1 },
  colNarrow: { width: 40, textAlign: "right" },
  colAmount: { width: 65, textAlign: "right" },

  // Amount in words
  wordsBox: {
    backgroundColor: brandLight,
    padding: 10,
    borderRadius: 3,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: brand,
  },
  wordsLabel: { fontSize: 7, color: gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  wordsValue: { fontSize: 9, fontWeight: "bold", color: dark },

  // LUT note
  lutBox: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    padding: 8,
    marginBottom: 12,
  },
  lutTitle: { fontSize: 9, fontWeight: "bold", color: "#78350f", letterSpacing: 0.4 },
  lutArn: { fontSize: 8, color: "#92400e", marginTop: 3, fontFamily: "Courier" },

  // Notes
  notesBox: {
    backgroundColor: grayLight,
    padding: 8,
    marginBottom: 12,
  },
  notesLabel: { fontSize: 7, color: gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  notesValue: { fontSize: 9, color: dark, lineHeight: 1.4 },

  // Bottom section
  bottomRow: { flexDirection: "row", gap: 20 },
  bankBox: { flex: 1 },
  bankTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: brand,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: brandLight,
  },
  bankRow: { flexDirection: "row", fontSize: 8, marginBottom: 3 },
  bankLabel: { width: 130, color: gray, paddingRight: 4 },
  bankValue: { flex: 1, color: dark },

  // Totals
  totalsBox: {
    width: 200,
    backgroundColor: grayLight,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: border,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, fontSize: 9 },
  totalLabel: { color: gray },
  totalValue: { color: dark },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: brand,
    fontSize: 11,
    fontWeight: "bold",
  },

  // Footer
  footerWrap: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: border,
    paddingTop: 8,
  },
  footerDetails: {
    textAlign: "center",
    fontSize: 7,
    color: gray,
    marginBottom: 2,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 6.5,
    color: "#9ca3af",
    marginTop: 4,
  },
});

type InvoicePDFProps = {
  invoice: {
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    currency: string;
    hsn_code: string;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
    client_name: string;
    client_address: string;
    client_state: string;
    client_country: string;
    client_gstin: string;
    client_is_international: number | boolean;
    place_of_supply?: string;
    export_type?: "lut" | "with_tax" | "";
    lut_arn?: string;
    notes?: string;
    po_reference?: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    gst_rate: number;
    amount: number;
  }[];
  company: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
    hsn_code: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    swift_code?: string;
    bank_accounts?: {
      id: string;
      label: string;
      currency: string;
      beneficiary_bank: string;
      beneficiary_account_name: string;
      beneficiary_account_number: string;
      ifsc: string;
      swift_code: string;
      is_primary: boolean;
    }[];
    email?: string;
    phone?: string;
    cin?: string;
    lut_enabled?: boolean;
    lut_arn?: string;
    lut_note?: string;
  };
  logoSrc?: string;
};

function pickBank(company: InvoicePDFProps["company"], invoiceCurrency: string) {
  const accounts = company.bank_accounts || [];
  if (accounts.length > 0) {
    const cur = (invoiceCurrency || "").toUpperCase();
    const match =
      accounts.find((a) => (a.currency || "").toUpperCase() === cur) ||
      accounts.find((a) => a.is_primary) ||
      accounts.find((a) => !a.currency) ||
      accounts[0];
    return {
      bank: match.beneficiary_bank,
      account_name: match.beneficiary_account_name,
      account_number: match.beneficiary_account_number,
      ifsc: match.ifsc,
      swift: match.swift_code,
    };
  }
  return {
    bank: company.bank_name || "",
    account_name: company.account_name || "",
    account_number: company.account_number || "",
    ifsc: company.ifsc || "",
    swift: company.swift_code || "",
  };
}

function fmtNumber(n: number): string {
  const parts = n.toFixed(2).split(".");
  const int = parts[0];
  const dec = parts[1];
  if (int.length <= 3) return int + "." + dec;
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return grouped + "," + last3 + "." + dec;
}

function fmt(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "Rs.", USD: "US$", EUR: "EUR", GBP: "GBP", AUD: "A$", SGD: "S$", HKD: "HK$", AED: "AED",
  };
  return (symbols[currency] || currency) + " " + fmtNumber(amount);
}

export default function InvoicePDF({ invoice, items, company, logoSrc }: InvoicePDFProps) {
  const hasCgstSgst = invoice.cgst > 0 || invoice.sgst > 0;
  const hasIgst = invoice.igst > 0;
  const cur = invoice.currency;
  const bank = pickBank(company, cur);
  const isExport = !!invoice.client_is_international;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBar}>
          <View style={s.headerLeft}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNum}>No: {invoice.invoice_number}</Text>
          </View>
          <View style={s.headerRight}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                /* Only height is set so the renderer keeps native aspect ratio.
                   maxWidth caps unusually wide banner logos. */
                style={{ height: 34, maxWidth: 160, marginBottom: 6 }}
              />
            ) : null}
            <Text style={s.companyName}>{company.name}</Text>
            <Text style={s.companyDetail}>GSTIN: {company.gstin} | PAN: {company.pan}</Text>
          </View>
        </View>

        {/* ── Meta Info ── */}
        <View style={s.metaGrid}>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Invoice Date</Text>
            <Text style={s.metaValue}>{invoice.invoice_date}</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{invoice.due_date}</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>HSN / SAC Code</Text>
            <Text style={s.metaValue}>{invoice.hsn_code || company.hsn_code || "-"}</Text>
          </View>
          <View style={invoice.po_reference ? s.metaBox : s.metaBoxLast}>
            <Text style={s.metaLabel}>Place of Supply</Text>
            <Text style={s.metaValue}>{invoice.place_of_supply || (isExport ? invoice.client_country : invoice.client_state) || "-"}</Text>
          </View>
          {invoice.po_reference ? (
            <View style={s.metaBoxLast}>
              <Text style={s.metaLabel}>PO Reference</Text>
              <Text style={s.metaValue}>{invoice.po_reference}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Billing ── */}
        <View style={s.billingRow}>
          <View style={s.billingBox}>
            <Text style={s.billingTitle}>Billed By</Text>
            <Text style={s.billingName}>{company.name}</Text>
            <Text style={s.billingText}>{company.address}</Text>
            <Text style={s.billingText}>GSTIN: {company.gstin}</Text>
            <Text style={s.billingText}>PAN: {company.pan}</Text>
          </View>
          <View style={s.billingBox}>
            <Text style={s.billingTitle}>Billed To</Text>
            <Text style={s.billingName}>{invoice.client_name}</Text>
            <Text style={s.billingText}>{invoice.client_address}</Text>
            {invoice.client_state ? <Text style={s.billingText}>State: {invoice.client_state}</Text> : null}
            <Text style={s.billingText}>Country: {invoice.client_country}</Text>
            {invoice.client_gstin ? <Text style={s.billingText}>GSTIN: {invoice.client_gstin}</Text> : null}
          </View>
        </View>

        {/* ── Items Table ── */}
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadText, s.colNum]}>#</Text>
            <Text style={[s.tableHeadText, s.colDesc]}>Description</Text>
            <Text style={[s.tableHeadText, s.colNarrow]}>GST %</Text>
            <Text style={[s.tableHeadText, s.colNarrow]}>Qty</Text>
            <Text style={[s.tableHeadText, s.colAmount]}>Rate</Text>
            <Text style={[s.tableHeadText, s.colAmount]}>Amount</Text>
            {hasCgstSgst && <Text style={[s.tableHeadText, s.colAmount]}>CGST</Text>}
            {hasCgstSgst && <Text style={[s.tableHeadText, s.colAmount]}>SGST</Text>}
            {hasIgst && <Text style={[s.tableHeadText, s.colAmount]}>IGST</Text>}
            <Text style={[s.tableHeadText, s.colAmount]}>Total</Text>
          </View>
          {items.map((item, i) => {
            const amount = item.quantity * item.rate;
            const tax = amount * (item.gst_rate / 100);
            const cgst = hasCgstSgst ? tax / 2 : 0;
            const sgst = hasCgstSgst ? tax / 2 : 0;
            const igst = hasIgst ? tax : 0;
            const lineTotal = amount + cgst + sgst + igst;
            return (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[{ fontSize: 8, color: gray }, s.colNum]}>{i + 1}</Text>
                <Text style={[{ fontSize: 8 }, s.colDesc]}>{item.description}</Text>
                <Text style={[{ fontSize: 8 }, s.colNarrow]}>{item.gst_rate}%</Text>
                <Text style={[{ fontSize: 8 }, s.colNarrow]}>{item.quantity}</Text>
                <Text style={[{ fontSize: 8 }, s.colAmount]}>{fmt(item.rate, cur)}</Text>
                <Text style={[{ fontSize: 8 }, s.colAmount]}>{fmt(amount, cur)}</Text>
                {hasCgstSgst && <Text style={[{ fontSize: 8, color: gray }, s.colAmount]}>{fmt(cgst, cur)}</Text>}
                {hasCgstSgst && <Text style={[{ fontSize: 8, color: gray }, s.colAmount]}>{fmt(sgst, cur)}</Text>}
                {hasIgst && <Text style={[{ fontSize: 8, color: gray }, s.colAmount]}>{fmt(igst, cur)}</Text>}
                <Text style={[{ fontSize: 8, fontWeight: "bold" }, s.colAmount]}>{fmt(lineTotal, cur)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Amount in Words ── */}
        <View style={s.wordsBox}>
          <Text style={s.wordsLabel}>Amount in Words</Text>
          <Text style={s.wordsValue}>{numberToWords(invoice.total, cur)}</Text>
        </View>

        {/* ── Free-form notes ── */}
        {invoice.notes ? (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Additional Notes</Text>
            <Text style={s.notesValue}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Bank Details + Totals ── */}
        <View style={s.bottomRow}>
          <View style={s.bankBox}>
            <Text style={s.bankTitle}>Bank Details</Text>
            {bank.bank ? (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>Beneficiary Bank</Text>
                <Text style={s.bankValue}>{bank.bank}</Text>
              </View>
            ) : null}
            {bank.account_name ? (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>Beneficiary Account Name</Text>
                <Text style={s.bankValue}>{bank.account_name}</Text>
              </View>
            ) : null}
            {bank.account_number ? (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>Beneficiary Account No.</Text>
                <Text style={s.bankValue}>{bank.account_number}</Text>
              </View>
            ) : null}
            {!isExport && bank.ifsc ? (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>IFSC</Text>
                <Text style={s.bankValue}>{bank.ifsc}</Text>
              </View>
            ) : null}
            {bank.swift ? (
              <View style={s.bankRow}>
                <Text style={s.bankLabel}>SWIFT</Text>
                <Text style={s.bankValue}>{bank.swift}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{fmt(invoice.subtotal, cur)}</Text>
            </View>
            {hasCgstSgst && (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>CGST</Text>
                  <Text style={s.totalValue}>{fmt(invoice.cgst, cur)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>SGST</Text>
                  <Text style={s.totalValue}>{fmt(invoice.sgst, cur)}</Text>
                </View>
              </>
            )}
            {hasIgst && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>IGST</Text>
                <Text style={s.totalValue}>{fmt(invoice.igst, cur)}</Text>
              </View>
            )}
            <View style={s.totalFinal}>
              <Text>Total ({cur})</Text>
              <Text style={{ color: brand }}>{fmt(invoice.total, cur)}</Text>
            </View>
          </View>
        </View>

        {/* ── LUT note (kept at end of invoice content, just above footer) ── */}
        {invoice.export_type === "lut" && (
          <View style={[s.lutBox, { marginTop: 16 }]}>
            <Text style={s.lutTitle}>
              {(company.lut_note || "EXPORT OF SERVICES WITHOUT PAYMENT OF TAX UNDER LUT").toUpperCase()}
            </Text>
            {invoice.lut_arn ? <Text style={s.lutArn}>ARN : {invoice.lut_arn}</Text> : null}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footerWrap}>
          <Text style={s.footerDetails}>
            {[
              company.name,
              company.cin ? `CIN: ${company.cin}` : "",
            ].filter(Boolean).join("  |  ")}
          </Text>
          <Text style={s.footerNote}>
            This is an electronically generated document, no signature is required.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
