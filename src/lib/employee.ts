import { EMPTY_SALARY_STRUCTURE, SalaryStructure } from "./types";

export function normalizeSalary(input: unknown): SalaryStructure {
  const src = (input || {}) as Record<string, unknown>;
  const s = { ...EMPTY_SALARY_STRUCTURE };
  for (const key of Object.keys(s) as (keyof SalaryStructure)[]) {
    s[key] = Number(src[key]) || 0;
  }
  return s;
}

/** Whitelists and normalizes an employee payload for create/update. */
export function employeeDataFromBody(body: Record<string, any>) {
  return {
    employee_code: body.employee_code || "",
    name: body.name || "",
    email: body.email || "",
    phone: body.phone || "",
    designation: body.designation || "",
    department: body.department || "",
    employment_type: body.employment_type || "full_time",
    status: body.status || "active",
    date_of_joining: body.date_of_joining || "",
    date_of_leaving: body.date_of_leaving || "",
    dob: body.dob || "",
    gender: body.gender || "",
    address: body.address || "",
    work_location: body.work_location || "",
    pan: body.pan || "",
    aadhaar: body.aadhaar || "",
    uan: body.uan || "",
    pf_number: body.pf_number || "",
    esi_number: body.esi_number || "",
    bank_name: body.bank_name || "",
    bank_account_number: body.bank_account_number || "",
    bank_ifsc: body.bank_ifsc || "",
    annual_ctc: Number(body.annual_ctc) || 0,
    salary: normalizeSalary(body.salary),
    offer_date: body.offer_date || "",
    offer_valid_until: body.offer_valid_until || "",
    probation_months: Number(body.probation_months) || 0,
    notice_period_days: Number(body.notice_period_days) || 0,
  };
}
