"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const dark = "#111827";
const gray = "#6b7280";
const border = "#9ca3af";
const muted = "#d1d5db";

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70,
    paddingHorizontal: 50,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: dark,
  },

  // Header (logo only — clean letterhead style)
  logoWrap: { marginBottom: 36 },
  logo: { height: 42, maxWidth: 160 },

  // Title block
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    textAlign: "center",
    color: dark,
    marginBottom: 28,
  },

  // Bank-details table
  table: {
    borderWidth: 1,
    borderColor: border,
    marginBottom: 60,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: border,
    minHeight: 36,
  },
  rowLast: {
    flexDirection: "row",
    minHeight: 36,
  },
  labelCell: {
    width: 170,
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: border,
    fontSize: 10.5,
    color: dark,
    justifyContent: "center",
  },
  valueCell: {
    flex: 1,
    padding: 10,
    fontSize: 10.5,
    color: dark,
    justifyContent: "center",
  },
  valueBold: {
    fontWeight: "bold",
  },
  valueLine: { lineHeight: 1.4 },

  // Signature block (right-aligned)
  signatureWrap: {
    alignItems: "flex-end",
    marginBottom: 60,
  },
  forCompany: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  electronicNote: {
    fontSize: 8,
    color: gray,
    fontStyle: "italic",
    marginTop: 10,
    maxWidth: 220,
    textAlign: "right",
  },
  signatoryName: { fontSize: 11, fontWeight: "bold" },
  signatoryDesignation: { fontSize: 10.5, fontWeight: "bold", marginBottom: 4 },
  metaSig: { fontSize: 9, color: gray, marginTop: 1 },

  // Footer (absolute bottom)
  footerWrap: {
    position: "absolute",
    bottom: 22,
    left: 50,
    right: 50,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: muted,
  },
  footerLine1: {
    fontSize: 8.5,
    fontWeight: "bold",
    textAlign: "center",
    color: dark,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  footerLine2: {
    fontSize: 8,
    textAlign: "center",
    color: gray,
  },
});

type BankLetterPDFProps = {
  company: {
    name: string;
    cin?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    signatory_name?: string;
    signatory_designation?: string;
    place_of_signing?: string;
  };
  account: {
    beneficiary_account_name?: string;
    beneficiary_bank?: string;
    bank_address?: string;
    beneficiary_account_number?: string;
    account_type?: string;
    currency?: string;
    swift_code?: string;
    ifsc?: string;
    iban?: string;
  };
  /** Issue date in YYYY-MM-DD form. */
  issueDate: string;
  /** Logo as data URL or absolute URL. */
  logoSrc?: string;
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(d, 10)}-${months[parseInt(m, 10) - 1] || m}-${y}`;
}

function currencyFull(code: string): string {
  const map: Record<string, string> = {
    INR: "INR (Indian Rupee)",
    USD: "USD (US Dollar)",
    EUR: "EURO",
    GBP: "GBP (Pound Sterling)",
    AED: "AED (UAE Dirham)",
    AUD: "AUD (Australian Dollar)",
    SGD: "SGD (Singapore Dollar)",
  };
  return map[code?.toUpperCase()] || code || "";
}

export default function BankLetterPDF({
  company,
  account,
  issueDate,
  logoSrc,
}: BankLetterPDFProps) {
  const isInternational = (account.currency || "").toUpperCase() !== "INR";

  // Build the rows we'll render. Skip empty rows for cleanliness.
  type Row = { label: string; value: string; bold?: boolean; multiline?: boolean };
  const rows: Row[] = [
    {
      label: "Account Holder Name",
      value: account.beneficiary_account_name || company.name || "",
      bold: true,
    },
    {
      label: "Bank Name and Address",
      value: account.beneficiary_bank || "",
      multiline: true,
    },
    {
      label: "Account Number",
      value: account.beneficiary_account_number || "",
    },
    ...(account.account_type
      ? [{ label: "Account Type", value: account.account_type }]
      : []),
    {
      label: "Currency",
      value: currencyFull(account.currency || ""),
      bold: true,
    },
    ...(isInternational
      ? [{ label: "SWIFT Code", value: account.swift_code || "" }]
      : [{ label: "IFSC Code", value: account.ifsc || "" }]),
    {
      label: "IBAN",
      value: account.iban || (isInternational ? "" : "Not Applicable to India"),
      bold: true,
    },
  ].filter((r) => r.value !== "" || r.label === "IBAN" /* always show IBAN row */);

  const lastIdx = rows.length - 1;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Logo */}
        <View style={s.logoWrap}>
          {logoSrc ? <Image src={logoSrc} style={s.logo} /> : null}
        </View>

        {/* Title */}
        <Text style={s.title}>TO WHOMSOEVER IT MAY CONCERN</Text>
        <Text style={s.subtitle}>
          This is to certify that the following are the official bank details of our company
        </Text>

        {/* Table */}
        <View style={s.table}>
          {rows.map((r, i) => (
            <View key={r.label} style={i === lastIdx ? s.rowLast : s.row}>
              <View style={s.labelCell}>
                <Text>{r.label}</Text>
              </View>
              <View style={s.valueCell}>
                <Text style={[r.bold ? s.valueBold : {}, r.multiline ? s.valueLine : {}]}>
                  {r.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Signature block */}
        <View style={s.signatureWrap}>
          <Text style={s.forCompany}>For {company.name?.toUpperCase()}</Text>
          {company.signatory_name ? (
            <Text style={s.signatoryName}>{company.signatory_name}</Text>
          ) : null}
          {company.signatory_designation ? (
            <Text style={s.signatoryDesignation}>{company.signatory_designation}</Text>
          ) : null}
          {issueDate ? <Text style={s.metaSig}>Date: {formatDate(issueDate)}</Text> : null}
          {company.place_of_signing ? (
            <Text style={s.metaSig}>Place: {company.place_of_signing}</Text>
          ) : null}
          <Text style={s.electronicNote}>This is an electronically issued document; no physical signature is required.</Text>
        </View>

        {/* Footer */}
        <View style={s.footerWrap} fixed>
          <Text style={s.footerLine1}>
            {[
              company.cin ? `CIN: ${company.cin}` : null,
              company.website ? company.website.toUpperCase() : null,
            ].filter(Boolean).join("  |  ")}
          </Text>
          {company.address ? (
            <Text style={s.footerLine2}>{company.address}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
