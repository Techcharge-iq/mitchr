-- =============================================
-- HRMS COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Create ENUM types for the system
CREATE TYPE public.app_role AS ENUM ('admin', 'hr_staff', 'manager', 'accountant', 'employee');
CREATE TYPE public.employment_status AS ENUM ('active', 'on_leave', 'terminated', 'suspended');
CREATE TYPE public.contract_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'half_day', 'on_leave', 'holiday');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.advance_status AS ENUM ('pending', 'approved', 'rejected', 'repaying', 'completed');
CREATE TYPE public.announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 4. Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Pakistan',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  designation TEXT,
  employment_status employment_status DEFAULT 'active',
  contract_type contract_type DEFAULT 'full_time',
  hire_date DATE DEFAULT CURRENT_DATE,
  termination_date DATE,
  reporting_manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_field_staff BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create salary_structures table
CREATE TABLE public.salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  housing_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  tax_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  working_hours_per_month INTEGER DEFAULT 300,
  effective_from DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status DEFAULT 'present',
  check_in_latitude DECIMAL(10,8),
  check_in_longitude DECIMAL(11,8),
  check_out_latitude DECIMAL(10,8),
  check_out_longitude DECIMAL(11,8),
  late_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

-- 9. Create GPS tracking logs table
CREATE TABLE public.gps_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy DECIMAL(10,2),
  speed DECIMAL(10,2),
  heading DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  battery_level INTEGER,
  is_moving BOOLEAN DEFAULT FALSE
);

-- 10. Create leave_types table
CREATE TABLE public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_days INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create leave_balances table
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days INTEGER DEFAULT 0,
  used_days INTEGER DEFAULT 0,
  remaining_days INTEGER GENERATED ALWAYS AS (total_days - used_days) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, leave_type_id, year)
);

-- 12. Create leave_applications table
CREATE TABLE public.leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create advances/loans table
CREATE TABLE public.advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  remaining_amount DECIMAL(12,2) NOT NULL,
  monthly_deduction DECIMAL(12,2) NOT NULL,
  reason TEXT,
  status advance_status DEFAULT 'pending',
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  start_deduction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create advance_repayments table
CREATE TABLE public.advance_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID REFERENCES public.advances(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payroll_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Create payroll table
CREATE TABLE public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  total_allowances DECIMAL(12,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) NOT NULL,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  attendance_deduction DECIMAL(12,2) DEFAULT 0,
  advance_deduction DECIMAL(12,2) DEFAULT 0,
  tax_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

-- 16. Create performance_goals table
CREATE TABLE public.performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL(12,2),
  current_value DECIMAL(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'units',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Create performance_reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  review_period TEXT,
  rating DECIMAL(3,1),
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  goals_achieved INTEGER DEFAULT 0,
  goals_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  is_company_document BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority DEFAULT 'normal',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  publish_date DATE DEFAULT CURRENT_DATE,
  expire_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Create announcement_reads table
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

-- 21. Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'general',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Create holidays table
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Create policies table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin or hr_staff
CREATE OR REPLACE FUNCTION public.is_admin_or_hr(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'hr_staff')
  )
$$;

-- Function to check if user is manager or above
CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'hr_staff', 'manager')
  )
$$;

-- Function to get employee_id from user_id
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin/HR can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin_or_hr(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Departments policies
CREATE POLICY "All authenticated users can view departments" ON public.departments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage departments" ON public.departments FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Branches policies
CREATE POLICY "All authenticated users can view branches" ON public.branches FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage branches" ON public.branches FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Employees policies
CREATE POLICY "Users can view own employee record" ON public.employees FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin/HR can view all employees" ON public.employees FOR SELECT USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Managers can view team employees" ON public.employees FOR SELECT USING (
  public.has_role(auth.uid(), 'manager') AND 
  reporting_manager_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR can manage employees" ON public.employees FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Salary structures policies
CREATE POLICY "Users can view own salary" ON public.salary_structures FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Accountant can view all salaries" ON public.salary_structures FOR SELECT USING (
  public.is_admin_or_hr(auth.uid()) OR public.has_role(auth.uid(), 'accountant')
);
CREATE POLICY "Admin/HR can manage salaries" ON public.salary_structures FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Attendance policies
CREATE POLICY "Users can view own attendance" ON public.attendance FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Users can insert own attendance" ON public.attendance FOR INSERT WITH CHECK (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR can manage all attendance" ON public.attendance FOR ALL USING (public.is_admin_or_hr(auth.uid()));
CREATE POLICY "Managers can view team attendance" ON public.attendance FOR SELECT USING (
  public.has_role(auth.uid(), 'manager') AND 
  employee_id IN (SELECT id FROM public.employees WHERE reporting_manager_id = public.get_employee_id(auth.uid()))
);

-- GPS logs policies
CREATE POLICY "Users can insert own GPS logs" ON public.gps_logs FOR INSERT WITH CHECK (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Users can view own GPS logs" ON public.gps_logs FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Managers can view all GPS logs" ON public.gps_logs FOR SELECT USING (public.is_manager_or_above(auth.uid()));

-- Leave types policies
CREATE POLICY "All authenticated can view leave types" ON public.leave_types FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage leave types" ON public.leave_types FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Leave balances policies
CREATE POLICY "Users can view own leave balance" ON public.leave_balances FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR can manage leave balances" ON public.leave_balances FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Leave applications policies
CREATE POLICY "Users can view own leave applications" ON public.leave_applications FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Users can create leave applications" ON public.leave_applications FOR INSERT WITH CHECK (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Managers can view all leave applications" ON public.leave_applications FOR SELECT USING (public.is_manager_or_above(auth.uid()));
CREATE POLICY "Admin/HR/Managers can update leave applications" ON public.leave_applications FOR UPDATE USING (public.is_manager_or_above(auth.uid()));

-- Advances policies
CREATE POLICY "Users can view own advances" ON public.advances FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Users can create advance requests" ON public.advances FOR INSERT WITH CHECK (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Accountant can manage advances" ON public.advances FOR ALL USING (
  public.is_admin_or_hr(auth.uid()) OR public.has_role(auth.uid(), 'accountant')
);

-- Advance repayments policies
CREATE POLICY "Users can view own repayments" ON public.advance_repayments FOR SELECT USING (
  advance_id IN (SELECT id FROM public.advances WHERE employee_id = public.get_employee_id(auth.uid()))
);
CREATE POLICY "Admin/HR/Accountant can manage repayments" ON public.advance_repayments FOR ALL USING (
  public.is_admin_or_hr(auth.uid()) OR public.has_role(auth.uid(), 'accountant')
);

-- Payroll policies
CREATE POLICY "Users can view own payroll" ON public.payroll FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Accountant can manage payroll" ON public.payroll FOR ALL USING (
  public.is_admin_or_hr(auth.uid()) OR public.has_role(auth.uid(), 'accountant')
);

-- Performance goals policies
CREATE POLICY "Users can view own goals" ON public.performance_goals FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Users can manage own goals" ON public.performance_goals FOR ALL USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Managers can view all goals" ON public.performance_goals FOR SELECT USING (public.is_manager_or_above(auth.uid()));

-- Performance reviews policies
CREATE POLICY "Users can view own reviews" ON public.performance_reviews FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid())
);
CREATE POLICY "Admin/HR/Managers can manage reviews" ON public.performance_reviews FOR ALL USING (public.is_manager_or_above(auth.uid()));

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (
  employee_id = public.get_employee_id(auth.uid()) OR is_company_document = TRUE
);
CREATE POLICY "Admin/HR can manage documents" ON public.documents FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Announcements policies
CREATE POLICY "All authenticated can view announcements" ON public.announcements FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage announcements" ON public.announcements FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Announcement reads policies
CREATE POLICY "Users can manage own reads" ON public.announcement_reads FOR ALL USING (user_id = auth.uid());

-- Events policies
CREATE POLICY "All authenticated can view events" ON public.events FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage events" ON public.events FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Holidays policies
CREATE POLICY "All authenticated can view holidays" ON public.holidays FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admin/HR can manage holidays" ON public.holidays FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- Policies table policies
CREATE POLICY "All authenticated can view policies" ON public.policies FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Admin/HR can manage policies" ON public.policies FOR ALL USING (public.is_admin_or_hr(auth.uid()));

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON public.leave_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_advances_updated_at BEFORE UPDATE ON public.advances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON public.performance_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert default leave types
INSERT INTO public.leave_types (name, description, default_days, is_paid) VALUES
  ('Annual Leave', 'Yearly vacation leave', 14, TRUE),
  ('Sick Leave', 'Medical leave for illness', 10, TRUE),
  ('Casual Leave', 'Personal casual leave', 7, TRUE),
  ('Maternity Leave', 'Leave for new mothers', 90, TRUE),
  ('Paternity Leave', 'Leave for new fathers', 10, TRUE),
  ('Unpaid Leave', 'Leave without pay', 30, FALSE);

-- Insert default holidays for 2025
INSERT INTO public.holidays (name, date, is_recurring) VALUES
  ('New Year', '2025-01-01', TRUE),
  ('Kashmir Day', '2025-02-05', TRUE),
  ('Pakistan Day', '2025-03-23', TRUE),
  ('Labour Day', '2025-05-01', TRUE),
  ('Independence Day', '2025-08-14', TRUE),
  ('Iqbal Day', '2025-11-09', TRUE),
  ('Quaid-e-Azam Day', '2025-12-25', TRUE);

-- Insert default branches
INSERT INTO public.branches (name, address, city) VALUES
  ('Head Office', 'Main Commercial Area', 'Karachi'),
  ('Lahore Branch', 'Gulberg III', 'Lahore'),
  ('Islamabad Branch', 'Blue Area', 'Islamabad');

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
  ('Human Resources', 'HR and employee management'),
  ('Sales', 'Sales and marketing team'),
  ('Operations', 'Delivery and logistics'),
  ('Finance', 'Accounts and payroll'),
  ('IT', 'Information technology'),
  ('Administration', 'General administration');

-- Enable realtime for GPS logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_logs;