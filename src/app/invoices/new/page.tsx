"use client";

import Link from "next/link";
import InvoiceForm from "@/components/InvoiceForm";
import { ArrowLeft } from "lucide-react";

export default function NewInvoicePage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to invoices
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to create a new invoice</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <InvoiceForm />
      </div>
    </div>
  );
}
