"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EmployeeForm from "@/components/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div>
      <div className="mb-8">
        <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2">
          <ArrowLeft className="w-4 h-4" /> Employees
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Employee</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create an employee record to generate offer letters and payslips</p>
      </div>
      <EmployeeForm />
    </div>
  );
}
