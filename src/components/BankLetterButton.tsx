"use client";

import { useState, createElement } from "react";
import { FileDown, Loader2 } from "lucide-react";

type BankAccount = {
  id: string;
  label?: string;
  currency?: string;
  beneficiary_bank?: string;
  bank_address?: string;
  beneficiary_account_name?: string;
  beneficiary_account_number?: string;
  account_type?: string;
  ifsc?: string;
  swift_code?: string;
  iban?: string;
};

async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export default function BankLetterButton({ account }: { account: BankAccount }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const settingsRes = await fetch("/api/settings");
      if (!settingsRes.ok) throw new Error("Failed to load company");
      const company = await settingsRes.json();

      const logoSrc = await fetchAsDataUrl(company.logo_path || "/portx-logo.png");

      const { pdf } = await import("@react-pdf/renderer");
      const { default: BankLetterPDF } = await import("@/components/BankLetterPDF");

      const today = new Date().toISOString().split("T")[0];
      const doc = createElement(BankLetterPDF, {
        company,
        account,
        issueDate: today,
        logoSrc,
      });
      const blob = await pdf(doc as any).toBlob();

      const fileName =
        `Bank-Letter-${(company.name || "Company").replace(/[^a-z0-9]+/gi, "-")}` +
        (account.currency ? `-${account.currency}` : "") +
        `.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Bank letter generation failed:", e);
      setError(e instanceof Error ? e.message : "Failed to generate PDF");
    }
    setBusy(false);
  }

  const hasMin =
    !!account.beneficiary_account_name &&
    !!account.beneficiary_bank &&
    !!account.beneficiary_account_number;

  return (
    <div className="border-t border-gray-100 pt-3 -mx-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs text-gray-500">
          Vendor onboarding letter for this account
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy || !hasMin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-violet-200 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!hasMin ? "Fill bank name, account name and account number first" : "Download bank-details certificate"}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          {busy ? "Generating..." : "Download bank letter"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1 px-1">{error}</p>}
    </div>
  );
}
