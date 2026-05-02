"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";

type CompanyLite = { id: string; name: string };

export default function CompanySwitcher() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([list, active]) => {
        setCompanies(Array.isArray(list) ? list : []);
        setActiveId(active?.id || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function switchCompany(id: string) {
    if (id === activeId) { setOpen(false); return; }
    setSwitching(id);
    try {
      const res = await fetch("/api/companies/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { setSwitching(null); return; }
      setActiveId(id);
      setOpen(false);
      setSwitching(null);
      router.refresh();
      // Hard reload so any client-side cached data is dropped
      window.location.reload();
    } catch {
      setSwitching(null);
    }
  }

  const active = companies.find((c) => c.id === activeId);

  if (companies.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 max-w-[220px]"
      >
        <Building2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
        <span className="truncate">{active?.name || "Select company"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
            Switch company
          </div>
          {companies.map((c) => {
            const isActive = c.id === activeId;
            const isSwitching = switching === c.id;
            return (
              <button
                key={c.id}
                onClick={() => switchCompany(c.id)}
                disabled={switching !== null}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-violet-50 disabled:opacity-50 ${
                  isActive ? "bg-violet-50/50" : ""
                }`}
              >
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-900">{c.name}</span>
                {isSwitching ? (
                  <Loader2 className="w-3.5 h-3.5 text-violet-600 animate-spin" />
                ) : isActive ? (
                  <Check className="w-3.5 h-3.5 text-violet-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
