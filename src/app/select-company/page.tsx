"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Loader2, ChevronRight } from "lucide-react";
import type { Company } from "@/lib/types";

export default function SelectCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data) => {
        setCompanies(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load companies");
        setLoading(false);
      });
  }, []);

  async function selectCompany(id: string) {
    setSelecting(id);
    setError("");
    try {
      const res = await fetch("/api/companies/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to select company");
        setSelecting(null);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/portx-logo.png" alt="Portx" width={120} height={38} priority />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Select a company</h1>
          <p className="mt-1 text-sm text-gray-500">Choose which company to work with</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No companies found.</p>
              <p className="text-xs text-gray-400 mt-1">Run the migration script to seed companies.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c.id)}
                  disabled={selecting !== null}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed text-left group transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{c.name}</div>
                    {c.gstin && (
                      <div className="text-xs text-gray-500 truncate">GSTIN: {c.gstin}</div>
                    )}
                  </div>
                  {selecting === c.id ? (
                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-violet-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
