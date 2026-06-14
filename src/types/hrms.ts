export type AppRole = 'admin' | 'hr_staff' | 'manager' | 'accountant' | 'employee';
export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'suspended' | 'resigned' | 'holiday';

export interface EmploymentHistory {
  id: string;
  employee_id: string;
  status: EmploymentStatus;
  effective_date: string;
  end_date: string | null;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type ContractType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'repaying' | 'completed';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  department_id: string | null;
  branch_id: string | null;
  designation: string | null;
  employment_status: EmploymentStatus;
  contract_type: ContractType;
  hire_date: string;
  termination_date: string | null;
  reporting_manager_id: string | null;
  is_field_staff: boolean;
  account_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  department?: Department;
  branch?: Branch;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  tax_deduction: number;
  other_deductions: number;
  working_hours_per_month: number;
  effective_from: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  notes: string | null;
  created_at: string;
  employee?: Employee;
}

export interface GpsLog {
  id: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  battery_level: number | null;
  is_moving: boolean;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  default_days: number;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  leave_type?: LeaveType;
}

export interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  leave_type?: LeaveType;
}

export interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  purpose: string | null;
  others: string | null;
  reason: string | null;
  status: AdvanceStatus;
  approved_by: string | null;
  approved_at: string | null;
  salary_adjusted_at: string | null;
  start_deduction_date: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  total_allowances: number;
  gross_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  attendance_deduction: number;
  advance_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  department_id: string | null;
  is_pinned: boolean;
  publish_date: string;
  expire_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  is_all_day: boolean;
  location: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  category: string;
  version: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  employee_id: string | null;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  is_company_document: boolean;
  uploaded_by: string | null;
  created_at: string;
}