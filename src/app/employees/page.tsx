"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TableSkeleton } from "@/components/Skeleton";
import DataTable from "@/components/DataTable";
import { type ColumnDef } from "@tanstack/react-table";
import { Employee, EMPLOYEE_STATUSES } from "@/lib/types";
import {
  Plus, Search, ContactRound, Briefcase, Calendar, IndianRupee,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  offered: "bg-amber-50 text-amber-600",
  resigned: "bg-gray-100 text-gray-500",
  terminated: "bg-red-50 text-red-600",
};

const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => { setEmployees(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => employees.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    if (!search) return matchesStatus;
    const q = search.toLowerCase();
    return matchesStatus && (
      e.name?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.designation?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    );
  }), [employees, search, statusFilter]);

  const statusCounts = employees.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const columns = useMemo<ColumnDef<Employee, any>[]>(() => [
    {
      accessorKey: "name",
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-gray-900">{row.original.name}</p>
          <p className="text-xs text-gray-400">{row.original.employee_code || "—"}</p>
        </div>
      ),
    },
    {
      accessorKey: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-gray-700">
          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
          <div>
            <p>{row.original.designation}</p>
            {row.original.department && <p className="text-xs text-gray-400">{row.original.department}</p>}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "date_of_joining",
      header: "Joined",
      size: 120,
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {(getValue() as string) || "—"}
        </span>
      ),
    },
    {
      accessorKey: "annual_ctc",
      header: "Annual CTC",
      size: 130,
      cell: ({ getValue }) => (
        <span className="flex items-center gap-1 text-gray-700 font-medium">
          <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
          {(getValue() as number) ? inr(getValue() as number).slice(1) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const label = EMPLOYEE_STATUSES.find((st) => st.value === v)?.label || v;
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium capitalize ${statusStyles[v] || "bg-gray-100 text-gray-500"}`}>
            {label}
          </span>
        );
      },
    },
  ], []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team, offer letters, payslips and HR documents</p>
        </div>
        <Link href="/employees/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm">
          <Plus className="w-4 h-4" /> Add Employee
        </Link>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : employees.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ContactRound className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No employees yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add your first employee to generate offer letters and payslips.</p>
          <Link href="/employees/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Add Employee
          </Link>
        </div>
      ) : (
        <>
          {/* Status pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === "all" ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              All ({employees.length})
            </button>
            {EMPLOYEE_STATUSES.filter((st) => statusCounts[st.value]).map((st) => (
              <button key={st.value} onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === st.value ? statusStyles[st.value] : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {st.label} ({statusCounts[st.value]})
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name, code, designation..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500" />
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={(row: Employee) => router.push(`/employees/${row.id}`)}
          />
        </>
      )}
    </div>
  );
}
