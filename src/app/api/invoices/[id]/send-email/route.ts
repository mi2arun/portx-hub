import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireActiveCompanyId } from "@/lib/auth";
import nodemailer from "nodemailer";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const companyId = await requireActiveCompanyId();
  const { id } = await params;
  const body = await req.json();
  const { to, cc, subject, message, pdfBase64 } = body;

  if (!to) {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  const companyDoc = await adminDb.collection("companies").doc(companyId).get();
  if (!companyDoc.exists) {
    return NextResponse.json({ error: "Company settings not configured" }, { status: 400 });
  }
  const company = companyDoc.data()!;

  if (!company.smtp_host || !company.smtp_user || !company.smtp_password) {
    return NextResponse.json({ error: "SMTP settings not configured. Go to Settings to set up email." }, { status: 400 });
  }

  const invoiceDoc = await adminDb.collection("invoices").doc(id).get();
  if (!invoiceDoc.exists || invoiceDoc.data()?.company_id !== companyId) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const invoice = invoiceDoc.data()!;

  let contactName = "";
  if (invoice.client_id) {
    const clientDoc = await adminDb.collection("clients").doc(invoice.client_id).get();
    if (clientDoc.exists) {
      contactName = clientDoc.data()?.contact_name || "";
    }
  }

  const transporter = nodemailer.createTransport({
    host: company.smtp_host,
    port: company.smtp_port || 587,
    secure: company.smtp_port === 465,
    auth: {
      user: company.smtp_user,
      pass: company.smtp_password,
    },
  });

  const fromName = company.smtp_from_name || company.name || "Portx Infotech";
  const fromEmail = company.smtp_from_email || company.smtp_user;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    cc: cc || undefined,
    subject: subject || `Invoice ${invoice.invoice_number} from ${company.name}`,
    html: message || buildDefaultEmail(invoice, company, contactName),
    attachments: pdfBase64
      ? [
          {
            filename: `${invoice.invoice_number}.pdf`,
            content: pdfBase64,
            encoding: "base64",
          },
        ]
      : [],
  };

  try {
    await transporter.sendMail(mailOptions);

    if (invoice.status === "draft") {
      await adminDb.collection("invoices").doc(id).update({
        status: "sent",
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, message: "Email sent successfully" });
  } catch (err: any) {
    console.error("Email send failed:", err);
    return NextResponse.json(
      { error: `Failed to send email: ${err.message}` },
      { status: 500 }
    );
  }
}

function buildDefaultEmail(
  invoice: Record<string, any>,
  company: Record<string, any>,
  contactName: string
): string {
  const symbols: Record<string, string> = {
    INR: "₹", USD: "US$", EUR: "€", GBP: "£",
  };
  const sym = symbols[invoice.currency] || invoice.currency + " ";
  const total = Number(invoice.total).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #7c3aed; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Invoice ${invoice.invoice_number}</h1>
        <p style="color: #e9d5ff; margin: 4px 0 0; font-size: 14px;">${company.name}</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px;">Dear ${contactName || invoice.client_name},</p>
        <p style="margin: 0 0 16px;">Please find attached the invoice for your reference.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 4px 0 0 0; font-size: 13px; color: #6b7280;">Invoice Number</td>
            <td style="padding: 8px 12px; background: #f3f4f6; border-radius: 0 4px 0 0; font-weight: bold;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Invoice Date</td>
            <td style="padding: 8px 12px; font-weight: bold;">${invoice.invoice_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-size: 13px; color: #6b7280;">Due Date</td>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: bold;">${invoice.due_date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Amount</td>
            <td style="padding: 8px 12px; font-weight: bold; color: #7c3aed; font-size: 16px;">${sym}${total}</td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 13px; color: #6b7280;">
          If you have any questions regarding this invoice, please don't hesitate to reach out.
        </p>
        <p style="margin: 16px 0 0; font-size: 13px;">
          Thank you for your business!<br/>
          <strong>${company.name}</strong>
        </p>
      </div>
      <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 16px;">
        This is an automated email from ${company.name}
      </p>
    </div>
  `;
}
