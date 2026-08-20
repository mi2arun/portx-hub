"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EmployeeForm from "@/components/EmployeeForm";
import { TableSkeleton } from "@/components/Skeleton";
import { Employee } from "@/lib/types";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setEmployee(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <div className="mb-8">
        <Link href={`/employees/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Employee</h1>
        {employee && <p className="text-sm text-gray-500 mt-0.5">{employee.name}</p>}
      </div>
      {loading ? (
        <TableSkeleton rows={8} cols={2} />
      ) : !employee ? (
        <p className="text-gray-500">Employee not found.</p>
      ) : (
        <EmployeeForm employee={employee} />
      )}
    </div>
  );
}
