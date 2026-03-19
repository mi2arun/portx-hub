"use client";

import { useState, useEffect, createElement } from "react";
import { Download, Loader2 } from "lucide-react";

type PDFDownloadButtonProps = {
  invoice: Record<string, unknown>;
  items: Record<string, unknown>[];
  company: Record<string, unknown>;
  fileName: string;
};

async function loadLogoBase64(): Promise<string> {
  try {
    const res = await fetch("/portx-logo.png");
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

export default function PDFDownloadButton({
  invoice, items, company, fileName,
}: PDFDownloadButtonProps) {
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { setReady(true); }, []);

  async function handleDownload() {
    setGenerating(true);
    try {
      const logoBase64 = await loadLogoBase64();
      const { pdf } = await import("@react-pdf/renderer");
      const { default: InvoicePDF } = await import("@/components/InvoicePDF");
      const doc = createElement(InvoicePDF, {
        invoice: invoice as any,
        items: items as any,
        company: company as any,
        logoSrc: logoBase64,
      });
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
    setGenerating(false);
  }

  if (!ready) return null;

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 shadow-sm"
    >
      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {generating ? "Generating..." : "PDF"}
    </button>
  );
}
