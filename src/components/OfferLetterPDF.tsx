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
import { monthlyGross, PF_ESI_ENABLED } from "@/lib/payroll";
import type { Employee, SalaryStructure } from "@/lib/types";

const dark = "#111827";
const gray = "#6b7280";
const border = "#9ca3af";
const muted = "#d1d5db";
const light = "#f3f4f6";

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70,
    paddingHorizontal: 50,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    color: dark,
    lineHeight: 1.5,
  },
  logoWrap: { marginBottom: 28 },
  logo: { width: 130, height: 44, objectFit: "contain" },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  meta: { fontSize: 10 },

  addressee: { marginBottom: 16 },
  bold: { fontWeight: "bold" },

  title: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    textDecoration: "underline",
    letterSpacing: 0.5,
  },
  subject: { fontWeight: "bold", marginBottom: 12 },
  para: { marginBottom: 10, textAlign: "justify" },

  // Key-terms table
  termsTable: { borderWidth: 1, borderColor: border, marginBottom: 12 },
  termsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border },
  termsRowLast: { flexDirection: "row" },
  termsLabel: {
    width: 160, padding: 6, paddingHorizontal: 8,
    borderRightWidth: 1, borderRightColor: border,
    fontSize: 9.5, fontWeight: "bold", backgroundColor: light,
  },
  termsValue: { flex: 1, padding: 6, paddingHorizontal: 8, fontSize: 9.5 },

  listItem: { flexDirection: "row", marginBottom: 4 },
  listBullet: { width: 14, fontSize: 10 },
  listText: { flex: 1, textAlign: "justify" },

  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  sigBlock: { maxWidth: 220 },
  sigImage: { width: 90, height: 36, objectFit: "contain", marginVertical: 6 },
  sigLine: { borderTopWidth: 1, borderTopColor: dark, width: 180, marginTop: 40, paddingTop: 4, fontSize: 9 },

  // Annexure salary table
  annexTitle: { fontSize: 12.5, fontWeight: "bold", textAlign: "center", marginBottom: 4, textDecoration: "underline" },
  annexSub: { fontSize: 10, textAlign: "center", color: gray, marginBottom: 16 },
  salTable: { borderWidth: 1, borderColor: border, marginBottom: 14 },
  salHead: { flexDirection: "row", backgroundColor: light, borderBottomWidth: 1, borderBottomColor: border },
  salRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: muted },
  salRowStrong: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: border, backgroundColor: light },
  salCellLabel: { flex: 1, padding: 6, paddingHorizontal: 8, fontSize: 9.5 },
  salCellNum: { width: 110, padding: 6, paddingHorizontal: 8, fontSize: 9.5, textAlign: "right" },
  salBold: { fontWeight: "bold" },
  note: { fontSize: 8.5, color: gray, marginBottom: 3 },

  footerWrap: {
    position: "absolute", bottom: 22, left: 50, right: 50,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: muted,
  },
  footerLine1: {
    fontSize: 8.5, fontWeight: "bold", textAlign: "center",
    color: dark, marginBottom: 3, letterSpacing: 0.3,
  },
  footerLine2: { fontSize: 8, textAlign: "center", color: gray },
});

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1] || m} ${y}`;
}

function inr(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

type CompanyInfo = {
  name: string;
  address?: string;
  cin?: string;
  email?: string;
  website?: string;
  signatory_name?: string;
  signatory_designation?: string;
  signature_url?: string;
  place_of_signing?: string;
};

type OfferLetterPDFProps = {
  company: CompanyInfo;
  employee: Employee;
  /** Issue date in YYYY-MM-DD form. */
  issueDate: string;
  logoSrc?: string;
  signatureSrc?: string;
};

function Letterhead({ logoSrc }: { logoSrc?: string }) {
  return (
    <View style={s.logoWrap}>
      {logoSrc ? <Image src={logoSrc} style={s.logo} /> : null}
    </View>
  );
}

function Footer({ company }: { company: CompanyInfo }) {
  return (
    <View style={s.footerWrap} fixed>
      <Text style={s.footerLine1}>
        {[
          company.cin ? `CIN: ${company.cin}` : null,
          company.website ? company.website.toUpperCase() : null,
        ].filter(Boolean).join("  |  ")}
      </Text>
      {company.address ? <Text style={s.footerLine2}>{company.address}</Text> : null}
    </View>
  );
}

export default function OfferLetterPDF({
  company, employee, issueDate, logoSrc, signatureSrc,
}: OfferLetterPDFProps) {
  const sal: SalaryStructure = employee.salary;
  const gross = monthlyGross(sal);
  const ctc = employee.annual_ctc ||
    (gross + (PF_ESI_ENABLED ? sal.pf_employer + sal.esi_employer : 0)) * 12;
  const refNo = `${(employee.employee_code || "HR").replace(/\s+/g, "")}/OFFER/${(issueDate || "").replace(/-/g, "")}`;

  const empType = ({
    full_time: "full-time", part_time: "part-time",
    intern: "internship", contract: "contract",
  } as Record<string, string>)[employee.employment_type] || "full-time";

  const keyTerms: { label: string; value: string }[] = [
    { label: "Designation", value: employee.designation },
    ...(employee.department ? [{ label: "Department", value: employee.department }] : []),
    { label: "Nature of Employment", value: empType.charAt(0).toUpperCase() + empType.slice(1) },
    { label: "Date of Joining", value: formatDate(employee.date_of_joining) || "To be mutually agreed" },
    ...(employee.work_location ? [{ label: "Place of Work", value: employee.work_location }] : []),
    {
      label: "Annual CTC",
      value: `Rs. ${inr(ctc)}/- (${numberToWordsINR(ctc)}) per annum`,
    },
    ...(employee.probation_months
      ? [{ label: "Probation Period", value: `${employee.probation_months} month${employee.probation_months > 1 ? "s" : ""} from the date of joining` }]
      : []),
    ...(employee.notice_period_days
      ? [{ label: "Notice Period", value: `${employee.notice_period_days} days` }]
      : []),
  ];

  const salaryRows: { label: string; monthly: number }[] = [
    { label: "Basic Salary", monthly: sal.basic },
    { label: "House Rent Allowance (HRA)", monthly: sal.hra },
    { label: "Conveyance Allowance", monthly: sal.conveyance_allowance },
    { label: "Medical Allowance", monthly: sal.medical_allowance },
    { label: "Special Allowance", monthly: sal.special_allowance },
    { label: "Other Allowance", monthly: sal.other_allowance },
  ].filter((r) => r.monthly > 0);

  const employerRows: { label: string; monthly: number }[] = PF_ESI_ENABLED
    ? [
        { label: "Employer's Contribution to Provident Fund", monthly: sal.pf_employer },
        { label: "Employer's Contribution to ESI", monthly: sal.esi_employer },
      ].filter((r) => r.monthly > 0)
    : [];

  const totalCtcMonthly = gross + employerRows.reduce((sum, r) => sum + r.monthly, 0);

  return (
    <Document>
      {/* ------------------------------------------------ Page 1: the letter */}
      <Page size="A4" style={s.page}>
        <Letterhead logoSrc={logoSrc} />

        <View style={s.metaRow}>
          <Text style={s.meta}>Ref: {refNo}</Text>
          <Text style={s.meta}>Date: {formatDate(issueDate)}</Text>
        </View>

        <View style={s.addressee}>
          <Text style={s.bold}>To,</Text>
          <Text style={s.bold}>{employee.name}</Text>
          {employee.address ? <Text>{employee.address}</Text> : null}
        </View>

        <Text style={s.title}>LETTER OF OFFER</Text>

        <Text style={s.para}>Dear {employee.name.split(" ")[0]},</Text>

        <Text style={s.para}>
          With reference to your application and the subsequent discussions you had with us,
          we are pleased to offer you {empType} employment with {company.name} on the
          following terms and conditions:
        </Text>

        <View style={s.termsTable}>
          {keyTerms.map((t, i) => (
            <View key={t.label} style={i === keyTerms.length - 1 ? s.termsRowLast : s.termsRow}>
              <Text style={s.termsLabel}>{t.label}</Text>
              <Text style={s.termsValue}>{t.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.para}>
          The detailed break-up of your compensation is set out in Annexure A to this letter.
          Your salary will be subject to deduction of tax at source and other statutory
          deductions as applicable under law.
        </Text>

        <Text style={s.para}>
          This offer is contingent upon satisfactory verification of your credentials and the
          documents listed in Annexure A, which you are requested to submit on or before your
          date of joining.
          {employee.offer_valid_until
            ? ` Please confirm your acceptance by signing and returning a copy of this letter on or before ${formatDate(employee.offer_valid_until)}, failing which this offer shall stand withdrawn.`
            : " Please confirm your acceptance by signing and returning a copy of this letter."}
        </Text>

        <Text style={s.para}>
          We look forward to welcoming you to the {company.name} team and wish you a long and
          rewarding career with us.
        </Text>

        <View style={s.signatureRow}>
          <View style={s.sigBlock}>
            <Text style={s.bold}>For {company.name}</Text>
            {signatureSrc ? <Image src={signatureSrc} style={s.sigImage} /> : <View style={{ height: 30 }} />}
            {company.signatory_name ? <Text style={s.bold}>{company.signatory_name}</Text> : null}
            {company.signatory_designation ? <Text>{company.signatory_designation}</Text> : null}
            {company.place_of_signing ? (
              <Text style={{ fontSize: 9, color: gray }}>Place: {company.place_of_signing}</Text>
            ) : null}
          </View>

          <View style={s.sigBlock}>
            <Text style={s.bold}>Acceptance</Text>
            <Text style={{ fontSize: 9, marginTop: 4 }}>
              I have read and understood the above terms and conditions and accept the offer.
            </Text>
            <Text style={s.sigLine}>Signature: {employee.name}    Date:</Text>
          </View>
        </View>

        <Footer company={company} />
      </Page>

      {/* ---------------------------------------- Page 2: Annexure A (salary) */}
      <Page size="A4" style={s.page}>
        <Letterhead logoSrc={logoSrc} />

        <Text style={s.annexTitle}>ANNEXURE A — COMPENSATION STRUCTURE</Text>
        <Text style={s.annexSub}>
          {employee.name}{employee.designation ? ` — ${employee.designation}` : ""}
        </Text>

        <View style={s.salTable}>
          <View style={s.salHead}>
            <Text style={[s.salCellLabel, s.salBold]}>Component</Text>
            <Text style={[s.salCellNum, s.salBold]}>Monthly (Rs.)</Text>
            <Text style={[s.salCellNum, s.salBold]}>Annual (Rs.)</Text>
          </View>

          {salaryRows.map((r) => (
            <View key={r.label} style={s.salRow}>
              <Text style={s.salCellLabel}>{r.label}</Text>
              <Text style={s.salCellNum}>{inr(r.monthly)}</Text>
              <Text style={s.salCellNum}>{inr(r.monthly * 12)}</Text>
            </View>
          ))}

          <View style={s.salRowStrong}>
            <Text style={[s.salCellLabel, s.salBold]}>Gross Salary (A)</Text>
            <Text style={[s.salCellNum, s.salBold]}>{inr(gross)}</Text>
            <Text style={[s.salCellNum, s.salBold]}>{inr(gross * 12)}</Text>
          </View>

          {employerRows.map((r) => (
            <View key={r.label} style={s.salRow}>
              <Text style={s.salCellLabel}>{r.label}</Text>
              <Text style={s.salCellNum}>{inr(r.monthly)}</Text>
              <Text style={s.salCellNum}>{inr(r.monthly * 12)}</Text>
            </View>
          ))}

          <View style={[s.salRowStrong, { borderBottomWidth: 0 }]}>
            <Text style={[s.salCellLabel, s.salBold]}>Total Cost to Company (CTC)</Text>
            <Text style={[s.salCellNum, s.salBold]}>{inr(totalCtcMonthly)}</Text>
            <Text style={[s.salCellNum, s.salBold]}>{inr(totalCtcMonthly * 12)}</Text>
          </View>
        </View>

        <Text style={s.note}>
          {PF_ESI_ENABLED
            ? `* Employee's contribution to Provident Fund${sal.esi_employee ? " and ESI" : ""}, Professional Tax and Income Tax (TDS) will be deducted from the gross salary as per applicable statutory provisions.`
            : "* Professional Tax and Income Tax (TDS) will be deducted from the gross salary as per applicable statutory provisions."}
        </Text>
        <Text style={[s.note, { marginBottom: 16 }]}>
          * Annual CTC: Rs. {inr(ctc)}/- ({numberToWordsINR(ctc)}).
        </Text>

        <Text style={s.subject}>Documents to be submitted at the time of joining</Text>
        {[
          "Copy of PAN Card and Aadhaar Card",
          "Educational certificates (mark sheets and degree certificates)",
          "Relieving letter and experience certificates from previous employers, if applicable",
          "Last three months' salary slips from previous employer, if applicable",
          "Two recent passport-size photographs",
          "Cancelled cheque or bank passbook copy for salary account",
        ].map((item) => (
          <View key={item} style={s.listItem}>
            <Text style={s.listBullet}>•</Text>
            <Text style={s.listText}>{item}</Text>
          </View>
        ))}

        <Text style={[s.subject, { marginTop: 14 }]}>General terms</Text>
        {[
          "You will be governed by the rules, regulations and policies of the company as amended from time to time.",
          "You shall maintain strict confidentiality of all business, technical and financial information of the company and its clients, both during and after your employment.",
          "Any intellectual property created by you during the course of your employment shall vest solely with the company.",
          `During probation, employment may be terminated by either party with shorter notice as per company policy; thereafter, either party may terminate employment by giving ${employee.notice_period_days || 30} days' written notice or salary in lieu thereof.`,
          "This offer supersedes all prior discussions and communications, whether oral or written.",
        ].map((item) => (
          <View key={item} style={s.listItem}>
            <Text style={s.listBullet}>•</Text>
            <Text style={s.listText}>{item}</Text>
          </View>
        ))}

        <Footer company={company} />
      </Page>
    </Document>
  );
}
