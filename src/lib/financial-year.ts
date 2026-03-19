/**
 * Indian Financial Year: April 1 to March 31
 * FY 2025-26 = April 1, 2025 to March 31, 2026
 */

export type FYRange = {
  label: string;    // "FY 2025-26"
  value: string;    // "2025-26"
  from: string;     // "2025-04-01"
  to: string;       // "2026-03-31"
};

export function getCurrentFY(): FYRange {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return getFY(year);
}

export function getFY(startYear: number): FYRange {
  const endYear = startYear + 1;
  return {
    label: `FY ${startYear}-${String(endYear).slice(2)}`,
    value: `${startYear}-${String(endYear).slice(2)}`,
    from: `${startYear}-04-01`,
    to: `${endYear}-03-31`,
  };
}

export function getRecentFYs(count: number = 5): FYRange[] {
  const current = getCurrentFY();
  const startYear = parseInt(current.value.split("-")[0]);
  const fys: FYRange[] = [];
  for (let i = 0; i < count; i++) {
    fys.push(getFY(startYear - i));
  }
  return fys;
}

export function getQuarters(fy: FYRange): { label: string; from: string; to: string }[] {
  const startYear = parseInt(fy.value.split("-")[0]);
  const endYear = startYear + 1;
  return [
    { label: "Q1 (Apr-Jun)", from: `${startYear}-04-01`, to: `${startYear}-06-30` },
    { label: "Q2 (Jul-Sep)", from: `${startYear}-07-01`, to: `${startYear}-09-30` },
    { label: "Q3 (Oct-Dec)", from: `${startYear}-10-01`, to: `${startYear}-12-31` },
    { label: "Q4 (Jan-Mar)", from: `${endYear}-01-01`, to: `${endYear}-03-31` },
  ];
}

export function getCurrentMonth(): { from: string; to: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
  const label = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { from, to, label };
}
