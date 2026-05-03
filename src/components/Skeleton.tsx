"use client";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded ${className}`}
      style={{ animationName: "shimmer" }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="border-b border-gray-100 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-3 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function InvoiceSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="h-7 w-52 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-16 bg-gray-200 rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-8 space-y-6">
        <div className="flex justify-between">
          <div className="h-6 w-36 bg-gray-200 rounded" />
          <div className="h-6 w-48 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-3/4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-8 bg-gray-100 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-50 rounded" />
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>

      {/* Companies card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-7 w-28 bg-gray-200 rounded-lg" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-3">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="h-4 w-56 bg-gray-200 rounded mb-1.5" />
                <div className="h-3 w-40 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column row: Company Info + Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="h-4 w-44 bg-gray-200 rounded" />
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <div className="h-3 w-24 bg-gray-200 rounded mb-1.5" />
                  <div className="h-9 w-full bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Two more cards: Invoice Numbering + Financial Year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="h-4 w-36 bg-gray-200 rounded" />
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-3 w-16 bg-gray-200 rounded mb-1.5" />
                  <div className="h-9 bg-gray-100 rounded-lg" />
                </div>
                <div>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1.5" />
                  <div className="h-9 bg-gray-100 rounded-lg" />
                </div>
              </div>
              <div className="h-10 w-full bg-violet-50 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* LUT card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between">
          <div className="h-4 w-56 bg-gray-200 rounded" />
          <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
        <div className="p-6 space-y-4">
          <div className="h-3 w-full bg-gray-100 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-gray-200 rounded mb-1.5" />
                <div className="h-9 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="h-10 w-32 bg-gray-200 rounded-lg" />
    </div>
  );
}

export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-7 w-10 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
