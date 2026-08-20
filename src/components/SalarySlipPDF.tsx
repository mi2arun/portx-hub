"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { numberToWordsINR } from "@/lib/amount-to-words";
import { formatMonth, PF_ESI_ENABLED } from "@/lib/payroll";
import type { Employee, SalarySlip } from "@/lib/types";

const dark = "#111827";
const gray = "#6b7280";
const border = "#9ca3af";
const muted = "#d1d5db";
const light = "#f3f4f6";

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: dark,
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  logo: { width: 110, height: 38, objectFit: "contain" },
  companyBlock: { alignItems: "flex-end", maxWidth: 300 },
  companyName: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  companyAddr: { fontSize: 8, color: gray, textAlign: "right", lineHeight: 1.4 },

  titleBar: {
    backgroundColor: light, borderWidth: 1, borderColor: border,
    paddingVertical: 6, marginTop: 10, marginBottom: 14,
  },
  title: { fontSize: 11, fontWeight: "bold", textAlign: "center", letterSpacing: 0.5 },

  // Employee info grid
  infoTable: { borderWidth: 1, borderColor: border, marginBottom: 14 },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: muted },
  infoRowLast: { flexDirection: "row" },
  infoCell: { flex: 1, flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8 },
  infoCellBorder: { borderRightWidth: 1, borderRightColor: muted },
  infoLabel: { width: 95, fontSize: 8.5, color: gray },
  infoValue: { flex: 1, fontSize: 9, fontWeight: "bold" },

  // Earnings / deductions
  payTable: { flexDirection: "row", borderWidth: 1, borderColor: border, marginBottom: 0 },
  payCol: { flex: 1 },
  payColLeft: { borderRightWidth: 1, borderRightColor: border },
  payHead: {
    flexDirection: "row", backgroundColor: light,
    borderBottomWidth: 1, borderBottomColor: border,
  },
  payHeadCell: { flex: 1, padding: 6, paddingHorizontal: 8, fontSize: 9, fontWeight: "bold" },
  payHeadNum: { width: 90, padding: 6, paddingHorizontal: 8, fontSize: 9, fontWeight: "bold", textAlign: "right" },
  payRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: light },
  payCellLabel: { flex: 1, paddingVertical: 5, paddingHorizontal: 8, fontSize: 9 },
  payCellNum: { width: 90, paddingVertical: 5, paddingHorizontal: 8, fontSize: 9, textAlign: "right" },

  totalRow: {
    flexDirection: "row", borderWidth: 1, borderColor: border, borderTopWidth: 0,
    backgroundColor: light,
  },
  totalCol: { flex: 1, flexDirection: "row" },
  totalColLeft: { borderRightWidth: 1, borderRightColor: border },
  totalLabel: { flex: 1, padding: 6, paddingHorizontal: 8, fontSize: 9, fontWeight: "bold" },
  totalNum: { width: 90, padding: 6, paddingHorizontal: 8, fontSize: 9, fontWeight: "bold", textAlign: "right" },

  netBar: {
    borderWidth: 1, borderColor: border, borderTopWidth: 0,
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 8, paddingHorizontal: 8, backgroundColor: "#e5e7eb",
    marginBottom: 6,
  },
  netLabel: { fontSize: 10.5, fontWeight: "bold" },
  netWords: { fontSize: 8.5, color: gray, marginBottom: 20 },

  payMeta: { fontSize: 8.5, color: gray, marginBottom: 2 },

  disclaimer: {
    fontSize: 8, color: gray, fontStyle: "italic",
    textAlign: "center", marginTop: 26,
  },

  footerWrap: {
    position: "absolute", bottom: 20, left: 40, right: 40,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: muted,
  },
  footerLine: { fontSize: 7.5, textAlign: "center", color: gray },
});

function inr(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(d, 10)}-${months[parseInt(m, 10) - 1] || m}-${y}`;
}

function maskAccount(acc: string): string {
  if (!acc || acc.length <= 4) return acc || "";
  return "XXXX" + acc.slice(-4);
}

type CompanyInfo = {
  name: string;
  address?: string;
  cin?: string;
  website?: string;
};

type SalarySlipPDFProps = {
  company: CompanyInfo;
  employee: Employee | null;
  slip: SalarySlip;
  logoSrc?: string;
};

export default function SalarySlipPDF({ company, employee, slip, logoSrc }: SalarySlipPDFProps) {
  const info: { label: string; value: string }[][] = [
    [
      { label: "Employee Name", value: slip.employee_name },
      { label: "Employee Code", value: slip.employee_code || "—" },
    ],
    [
      { label: "Designation", value: slip.designation || "—" },
      { label: "Department", value: slip.department || "—" },
    ],
    [
      { label: "Date of Joining", value: formatDate(employee?.date_of_joining || "") || "—" },
      { label: "PAN", value: employee?.pan || "—" },
    ],
    ...(PF_ESI_ENABLED ? [[
      { label: "UAN", value: employee?.uan || "—" },
      { label: "ESI Number", value: employee?.esi_number || "—" },
    ]] : []),
    [
      { label: "Bank", value: employee?.bank_name || "—" },
      { label: "Account No.", value: maskAccount(employee?.bank_account_number || "") || "—" },
    ],
    [
      { label: "Paid Days", value: `${slip.paid_days} / ${slip.total_days}` },
      { label: "LOP Days", value: String(slip.lop_days || 0) },
    ],
  ];

  const rowCount = Math.max(slip.earnings.length, slip.deductions.length);
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    earning: slip.earnings[i],
    deduction: slip.deductions[i],
  }));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          {logoSrc ? <Image src={logoSrc} style={s.logo} /> : <View />}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{company.name}</Text>
            {company.address ? <Text style={s.companyAddr}>{company.address}</Text> : null}
          </View>
        </View>

        <View style={s.titleBar}>
          <Text style={s.title}>PAY SLIP FOR THE MONTH OF {formatMonth(slip.month).toUpperCase()}</Text>
        </View>

        {/* Employee info */}
        <View style={s.infoTable}>
          {info.map((pair, i) => (
            <View key={i} style={i === info.length - 1 ? s.infoRowLast : s.infoRow}>
              <View style={[s.infoCell, s.infoCellBorder]}>
                <Text style={s.infoLabel}>{pair[0].label}</Text>
                <Text style={s.infoValue}>{pair[0].value}</Text>
              </View>
              <View style={s.infoCell}>
                <Text style={s.infoLabel}>{pair[1].label}</Text>
                <Text style={s.infoValue}>{pair[1].value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Earnings / Deductions */}
        <View style={s.payTable}>
          <View style={[s.payCol, s.payColLeft]}>
            <View style={s.payHead}>
              <Text style={s.payHeadCell}>EARNINGS</Text>
              <Text style={s.payHeadNum}>AMOUNT (Rs.)</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={s.payRow}>
                <Text style={s.payCellLabel}>{r.earning?.label || " "}</Text>
                <Text style={s.payCellNum}>{r.earning ? inr(r.earning.amount) : " "}</Text>
              </View>
            ))}
          </View>
          <View style={s.payCol}>
            <View style={s.payHead}>
              <Text style={s.payHeadCell}>DEDUCTIONS</Text>
              <Text style={s.payHeadNum}>AMOUNT (Rs.)</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={s.payRow}>
                <Text style={s.payCellLabel}>{r.deduction?.label || " "}</Text>
                <Text style={s.payCellNum}>{r.deduction ? inr(r.deduction.amount) : " "}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={s.totalRow}>
          <View style={[s.totalCol, s.totalColLeft]}>
            <Text style={s.totalLabel}>Gross Earnings</Text>
            <Text style={s.totalNum}>{inr(slip.gross_earnings)}</Text>
          </View>
          <View style={s.totalCol}>
            <Text style={s.totalLabel}>Total Deductions</Text>
            <Text style={s.totalNum}>{inr(slip.total_deductions)}</Text>
          </View>
        </View>

        {/* Net pay */}
        <View style={s.netBar}>
          <Text style={s.netLabel}>NET PAY</Text>
          <Text style={s.netLabel}>Rs. {inr(slip.net_pay)}/-</Text>
        </View>
        <Text style={s.netWords}>Net Pay (in words): {numberToWordsINR(slip.net_pay)}</Text>

        {slip.payment_date ? (
          <Text style={s.payMeta}>Payment Date: {formatDate(slip.payment_date)}</Text>
        ) : null}
        {slip.payment_mode ? (
          <Text style={s.payMeta}>
            Payment Mode: {slip.payment_mode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        ) : null}
        {slip.notes ? <Text style={s.payMeta}>Notes: {slip.notes}</Text> : null}

        <Text style={s.disclaimer}>
          This is a computer-generated pay slip and does not require a signature or seal.
        </Text>

        {/* Footer */}
        <View style={s.footerWrap} fixed>
          <Text style={s.footerLine}>
            {[
              company.name,
              company.cin ? `CIN: ${company.cin}` : null,
              company.website || null,
            ].filter(Boolean).join("  |  ")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
