"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import InvoiceForm from "@/components/InvoiceForm";
import { ArrowLeft, FileText } from "lucide-react";

export default function EditInvoicePage() {
  const { id } = useParams();
  const [data, setData] = useState<{
    invoice: Record<string, unknown>;
    items: { description: string; quantity: number; rate: number; gst_rate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d) => {
        if (!d.invoice) throw new Error("Not found");
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="h-12 bg-gray-100 rounded-lg" />
          <div className="h-64 bg-gray-50 rounded-lg mt-4" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-semibold text-gray-900 mb-1">
          {error ? "This invoice cannot be edited" : "Invoice not found"}
        </p>
        <Link href="/" className="text-violet-600 hover:underline text-sm">Back to invoices</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/invoices/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to invoice
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit {data.invoice.invoice_number as string}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update the invoice details below</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <InvoiceForm
          invoiceId={id as string}
          initialData={{
            client_id: data.invoice.client_id as string,
            invoice_date: data.invoice.invoice_date as string,
            due_date: data.invoice.due_date as string,
            status: data.invoice.status as string,
            items: data.items,
            place_of_supply: (data.invoice.place_of_supply as string) || "",
            export_type: ((data.invoice.export_type as string) || "") as "lut" | "with_tax" | "",
            notes: (data.invoice.notes as string) || "",
            po_reference: (data.invoice.po_reference as string) || "",
          }}
        />
      </div>
    </div>
  );
}
