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
  invoiceNum: { fontSize: 10, color: gray, marginTop: 3 },
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
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: brand,
  },
  wordsLabel: { fontSize: 7, color: gray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  wordsValue: { fontSize: 9, fontWeight: "bold", color: dark },

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
  bankLabel: { width: 75, color: gray },
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
  footerCompany: {
    textAlign: "center",
    fontSize: 8,
    fontWeight: "bold",
    color: dark,
    marginBottom: 3,
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
    bank_name: string;
    account_name: string;
    account_number: string;
    ifsc: string;
    swift_code: string;
    email?: string;
    phone?: string;
    cin?: string;
  };
  logoSrc?: string;
};

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

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBar}>
          <View style={s.headerLeft}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNum}>{invoice.invoice_number}</Text>
          </View>
          <View style={s.headerRight}>
            {logoSrc ? <Image src={logoSrc} style={{ width: 110, height: 35, marginBottom: 4 }} /> : null}
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
          <View style={s.metaBoxLast}>
            <Text style={s.metaLabel}>HSN / SAC Code</Text>
            <Text style={s.metaValue}>{invoice.hsn_code || company.hsn_code}</Text>
          </View>
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

        {/* ── Bank Details + Totals ── */}
        <View style={s.bottomRow}>
          <View style={s.bankBox}>
            <Text style={s.bankTitle}>Bank Details</Text>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>Bank</Text>
              <Text style={s.bankValue}>{company.bank_name}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>Account Name</Text>
              <Text style={s.bankValue}>{company.account_name}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>Account No.</Text>
              <Text style={s.bankValue}>{company.account_number}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>IFSC</Text>
              <Text style={s.bankValue}>{company.ifsc}</Text>
            </View>
            <View style={s.bankRow}>
              <Text style={s.bankLabel}>SWIFT</Text>
              <Text style={s.bankValue}>{company.swift_code}</Text>
            </View>
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

        {/* ── Footer ── */}
        <View style={s.footerWrap}>
          <Text style={s.footerDetails}>
            {[
              company.name,
              company.cin ? `CIN: ${company.cin}` : "",
              company.email,
              company.phone,
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
