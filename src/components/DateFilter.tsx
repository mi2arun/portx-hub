"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { getCurrentFY, getRecentFYs, getQuarters, getCurrentMonth, FYRange } from "@/lib/financial-year";

type DateRange = { from: string; to: string };

type DateFilterProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

export default function DateFilter({ value, onChange }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const fys = getRecentFYs(4);
  const currentFy = getCurrentFY();
  const quarters = getQuarters(currentFy);
  const currentMonth = getCurrentMonth();

  const activeLabel = getLabel(value);

  function getLabel(range: DateRange): string {
    if (!range.from && !range.to) return "All Time";
    // Check FY match
    for (const fy of fys) {
      if (range.from === fy.from && range.to === fy.to) return fy.label;
    }
    // Check quarter match
    for (const q of quarters) {
      if (range.from === q.from && range.to === q.to) return q.label;
    }
    // Check current month
    if (range.from === currentMonth.from && range.to === currentMonth.to) return currentMonth.label;
    // Custom
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Until ${range.to}`;
    return "All Time";
  }

  function select(from: string, to: string) {
    onChange({ from, to });
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 min-w-[160px]"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-gray-700 truncate">{activeLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-72 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setMode("preset")}
                className={`flex-1 px-3 py-2.5 text-xs font-medium ${mode === "preset" ? "text-violet-600 border-b-2 border-violet-600" : "text-gray-500"}`}
              >
                Quick Select
              </button>
              <button
                onClick={() => setMode("custom")}
                className={`flex-1 px-3 py-2.5 text-xs font-medium ${mode === "custom" ? "text-violet-600 border-b-2 border-violet-600" : "text-gray-500"}`}
              >
                Custom Range
              </button>
            </div>

            {mode === "preset" ? (
              <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
                <button onClick={() => select("", "")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!value.from && !value.to ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                  All Time
                </button>

                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">This Period</p>
                <button onClick={() => select(currentMonth.from, currentMonth.to)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${value.from === currentMonth.from && value.to === currentMonth.to ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                  {currentMonth.label}
                </button>

                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Financial Year</p>
                {fys.map((fy) => (
                  <button key={fy.value} onClick={() => select(fy.from, fy.to)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${value.from === fy.from && value.to === fy.to ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                    {fy.label}
                  </button>
                ))}

                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quarters ({currentFy.label})</p>
                {quarters.map((q) => (
                  <button key={q.label} onClick={() => select(q.from, q.to)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${value.from === q.from && value.to === q.to ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                    {q.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { onChange({ from: "", to: "" }); setOpen(false); }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Clear
                  </button>
                  <button onClick={() => setOpen(false)}
                    className="flex-1 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
