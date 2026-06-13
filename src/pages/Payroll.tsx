import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowRightLeft,
  Check,
  CircleDollarSign,
  ClipboardList,
  FileText,
  History,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PrintablePayslip, PrintableStatement } from '@/components/payroll/PrintableDocs';

const PURPOSES = ['Food', 'Petrol', 'Personal Advance', 'Office Expenses'] as const;
type Purpose = (typeof PURPOSES)[number];
type AdvanceStatus = 'pending' | 'approved' | 'rejected' | 'repaying' | 'completed';
type PayrollTab = 'salary' | 'advances' | 'payslips' | 'statements';

type EmployeeOption = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
};


type SalaryStructureRecord = {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number | null;
  transport_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
  tax_deduction: number | null;
  other_deductions: number | null;
  employees?: EmployeeOption | null;
};

type PayrollRecord = {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  gross_salary: number;
  attendance_deduction: number | null;
  advance_deduction: number | null;
  tax_deduction: number | null;
  other_deductions: number | null;
  net_salary: number;
  status: string | null;
  employees?: EmployeeOption | null;
};

type AdvanceRecord = {
  id: string;
  employee_id: string;
  amount: number;
  remaining_amount: number;
  monthly_deduction: number;
  reason: string | null;
  purpose?: string | null;
  others?: string | null;
  expense_date: string;
  status: AdvanceStatus | null;
  approved_at: string | null;
  salary_adjusted_at?: string | null;
  start_deduction_date: string | null;
  created_at: string | null;
  employees?: EmployeeOption | null;
};

const tabFromPath = (pathname: string): PayrollTab => {
  const tab = pathname.split('/').filter(Boolean).pop();
  return ['salary', 'advances', 'payslips', 'statements'].includes(tab || '') ? (tab as PayrollTab) : 'salary';
};

const formatCurrency = (value?: number | null) => `OMR ${(Number(value) || 0).toLocaleString()}`;
const employeeName = (employee?: EmployeeOption | null) => employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned employee';

const parseDateValue = (year: number, month: number) => new Date(year, month - 1, 1).getTime();

const rebuildEmployeeAdvanceBalances = async (employeeId: string) => {
  const [{ data: advancesData, error: advancesError }, { data: payrollsData, error: payrollsError }] = await Promise.all([
    supabase
      .from('advances')
      .select('id, employee_id, amount, remaining_amount, monthly_deduction, purpose, status, created_at')
      .eq('employee_id', employeeId),
    supabase
      .from('payroll')
      .select('id, employee_id, month, year, advance_deduction')
      .eq('employee_id', employeeId),
  ]);

  if (advancesError || payrollsError) {
    throw advancesError || payrollsError;
  }

  const advances = advancesData ?? [];
  const payrolls = (payrollsData ?? []).sort((a, b) => parseDateValue(a.year, a.month) - parseDateValue(b.year, b.month));

  const remainingById = new Map<string, number>(advances.map((advance) => [advance.id, Number(advance.amount) || 0]));

  const deductibleAdvances = advances
    .filter((advance) => advance.status !== 'pending' && advance.status !== 'rejected')
    .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

  payrolls.forEach((payroll) => {
    let deduction = Number(payroll.advance_deduction) || 0;
    if (deduction <= 0) return;

    for (const advance of deductibleAdvances) {
      const currentRemaining = Number(remainingById.get(advance.id) || 0);
      if (currentRemaining <= 0) continue;

      const maxForAdvance = Math.min(Number(advance.monthly_deduction) || Number(advance.amount) || 0, currentRemaining);
      const applied = Math.min(maxForAdvance, deduction);
      if (applied <= 0) continue;

      remainingById.set(advance.id, currentRemaining - applied);
      deduction -= applied;
      if (deduction <= 0) break;
    }
  });

  const updates = advances.map((advance) => {
    const originalAmount = Number(advance.amount) || 0;
    const newRemaining = Number((remainingById.get(advance.id) ?? originalAmount) || 0);
    const recoveredAmount = originalAmount - newRemaining;
    let newStatus: AdvanceStatus | null = advance.status || 'pending';

    if (advance.status === 'pending' || advance.status === 'rejected') {
      newStatus = advance.status || 'pending';
    } else if (newRemaining <= 0) {
      newStatus = 'completed';
    } else if (recoveredAmount > 0) {
      newStatus = 'repaying';
    } else {
      newStatus = 'approved';
    }

    return {
      id: advance.id,
      remaining_amount: newRemaining,
      status: newStatus,
    };
  });

  if (updates.length > 0) {
    const { error: updateError } = await supabase.from('advances').upsert(updates, { onConflict: ['id'] });
    if (updateError) throw updateError;
  }
};

const statusClassName = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-success/10 text-success hover:bg-success/10';
    case 'rejected':
      return 'bg-destructive/10 text-destructive hover:bg-destructive/10';
    case 'pending':
      return 'bg-warning/10 text-warning hover:bg-warning/10';
    case 'repaying':
      return 'bg-primary/10 text-primary hover:bg-primary/10';
    case 'completed':
      return 'bg-muted text-muted-foreground hover:bg-muted';
    default:
      return 'bg-muted text-muted-foreground hover:bg-muted';
  }
};

export default function Payroll() {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<AdvanceRecord | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [payslipEditForm, setPayslipEditForm] = useState({
    gross_salary: '',
    attendance_deduction: '',
    advance_deduction: '',
    tax_deduction: '',
    other_deductions: '',
    status: 'draft',
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [printPayslip, setPrintPayslip] = useState<PayrollRecord | null>(null);
  const [printStatementEmpId, setPrintStatementEmpId] = useState<string | null>(null);
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '',
    purpose: '' as Purpose | '',
    others: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    monthly_deduction: '',
  });
  const [salaryForm, setSalaryForm] = useState({
    employee_id: '',
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    medical_allowance: '',
    other_allowances: '',
    tax_deduction: '',
    other_deductions: '',
    working_hours_per_month: '160',
  });
  const [payrollForm, setPayrollForm] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    employee_ids: [] as string[],
  });
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const activeTab = tabFromPath(location.pathname);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('employment_status', 'active')
        .order('first_name');
      if (error) throw error;
      return data as EmployeeOption[];
    },
  });

  const { data: salaryStructures = [] } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*, employees(first_name, last_name, employee_code)')
        .eq('is_active', true);
      if (error) throw error;
      return data as unknown as SalaryStructureRecord[];
    },
  });

  const { data: advances = [] } = useQuery({
    queryKey: ['advances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advances')
        .select('*, employees!advances_employee_id_fkey(first_name, last_name, employee_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AdvanceRecord[];
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select('*, employees(first_name, last_name, employee_code)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as PayrollRecord[];
    },
  });

  const advanceSummary = useMemo(() => {
    const totals = advances.reduce(
      (acc, advance) => {
        const amount = Number(advance.amount) || 0;
        if (advance.status === 'pending') acc.pending += 1;
        if (advance.status === 'approved') {
          acc.approved += amount;
        }
        if (advance.status === 'rejected') {
          acc.rejected += amount;
        }
        if (advance.status === 'approved' || advance.status === 'repaying') {
          acc.outstanding += Number(advance.remaining_amount) || 0;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, outstanding: 0 },
    );
    return totals;
  }, [advances]);

  const employeeStatements = useMemo(() => employees.map((employee) => {
    const employeeAdvances = advances.filter((advance) => advance.employee_id === employee.id);
    const employeePayrolls = payrolls.filter((payroll) => payroll.employee_id === employee.id);

    const approvedExpenseAmount = employeeAdvances
      .filter((advance) => advance.status === 'approved' && advance.purpose !== 'Personal Advance')
      .reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);

    const rejectedExpenseAmount = employeeAdvances
      .filter((advance) => advance.status === 'rejected' && advance.purpose !== 'Personal Advance')
      .reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);

    const eligibleAdvances = employeeAdvances.filter((advance) => advance.status === 'approved' || advance.status === 'repaying' || advance.status === 'completed');
    const totalAdvanceAmount = eligibleAdvances.reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);
    const totalRecoveredAmount = employeePayrolls.reduce((sum, payroll) => sum + (Number(payroll.advance_deduction) || 0), 0);
    const outstandingBalance = totalAdvanceAmount - totalRecoveredAmount;

    const sortedAdvances = [...employeeAdvances].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

    return {
      employee,
      totalAdvances: totalAdvanceAmount,
      totalRecovered: totalRecoveredAmount,
      approvedExpenses: approvedExpenseAmount,
      rejectedExpenses: rejectedExpenseAmount,
      outstandingBalance,
      salaryDeductions: totalRecoveredAmount,
      latestActivity: sortedAdvances[0]?.created_at,
      requestCount: employeeAdvances.length,
      netOutstanding: outstandingBalance,
    };
  }), [advances, employees, payrolls]);

  const selectedStatementRows = selectedEmployeeId === 'all'
    ? employeeStatements
    : employeeStatements.filter((statement) => statement.employee.id === selectedEmployeeId);

  const createSalaryStructure = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('salary_structures').insert({
        employee_id: salaryForm.employee_id,
        basic_salary: parseFloat(salaryForm.basic_salary),
        housing_allowance: salaryForm.housing_allowance ? parseFloat(salaryForm.housing_allowance) : null,
        transport_allowance: salaryForm.transport_allowance ? parseFloat(salaryForm.transport_allowance) : null,
        medical_allowance: salaryForm.medical_allowance ? parseFloat(salaryForm.medical_allowance) : null,
        other_allowances: salaryForm.other_allowances ? parseFloat(salaryForm.other_allowances) : null,
        tax_deduction: salaryForm.tax_deduction ? parseFloat(salaryForm.tax_deduction) : null,
        other_deductions: salaryForm.other_deductions ? parseFloat(salaryForm.other_deductions) : null,
        working_hours_per_month: parseInt(salaryForm.working_hours_per_month),
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
      toast.success('Salary structure created successfully');
      setSalaryOpen(false);
      setSalaryForm({
        employee_id: '',
        basic_salary: '',
        housing_allowance: '',
        transport_allowance: '',
        medical_allowance: '',
        other_allowances: '',
        tax_deduction: '',
        other_deductions: '',
        working_hours_per_month: '160',
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAdvance = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(advanceForm.amount);
      const monthlyDeduction = advanceForm.monthly_deduction ? parseFloat(advanceForm.monthly_deduction) : amount;
      const { error } = await supabase.from('advances').insert({
        employee_id: advanceForm.employee_id,
        amount,
        monthly_deduction: monthlyDeduction,
        remaining_amount: amount,
        reason: advanceForm.others,
        purpose: advanceForm.purpose,
        others: advanceForm.others,
        expense_date: advanceForm.expense_date,
        status: 'pending',
      });
      if (error) throw error;
      await rebuildEmployeeAdvanceBalances(advanceForm.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Employee advance / expense request submitted');
      setAdvanceOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', purpose: '', others: '', expense_date: format(new Date(), 'yyyy-MM-dd'), monthly_deduction: '' });
    },
    onError: () => toast.error('Failed to submit request'),
  });

  const updateAdvanceWorkflow = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approved' | 'rejected' | 'salary_deduction' }) => {
      const patch: Record<string, any> =
        action === 'approved'
          ? { status: 'approved', approved_at: new Date().toISOString() }
          : action === 'rejected'
          ? { status: 'rejected', approved_at: new Date().toISOString() }
          : {
              status: 'repaying',
              salary_adjusted_at: new Date().toISOString(),
              start_deduction_date: new Date().toISOString().split('T')[0],
            };
      const { data, error } = await supabase.from('advances').update(patch).select('employee_id').eq('id', id).single();
      if (error) throw error;
      if (data?.employee_id) await rebuildEmployeeAdvanceBalances(data.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Request updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAdvance = useMutation({
    mutationFn: async () => {
      if (!editingAdvance) return;
      const amount = parseFloat(advanceForm.amount);
      const monthlyDeduction = advanceForm.monthly_deduction ? parseFloat(advanceForm.monthly_deduction) : amount;
      const { data, error } = await supabase
        .from('advances')
        .update({
          amount,
          monthly_deduction: monthlyDeduction,
          purpose: advanceForm.purpose,
          others: advanceForm.others,
          reason: advanceForm.others,
          expense_date: advanceForm.expense_date,
        })
        .select('employee_id')
        .eq('id', editingAdvance.id)
        .single();
      if (error) throw error;
      if (data?.employee_id) await rebuildEmployeeAdvanceBalances(data.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Request updated');
      setAdvanceOpen(false);
      setEditingAdvance(null);
      setAdvanceForm({ employee_id: '', amount: '', purpose: '', others: '', expense_date: format(new Date(), 'yyyy-MM-dd'), monthly_deduction: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAdvance = useMutation({
    mutationFn: async (id: string) => {
      const { data: currentAdvance, error: fetchError } = await supabase.from('advances').select('employee_id').eq('id', id).single();
      if (fetchError) throw fetchError;
      const { error } = await supabase.from('advances').delete().eq('id', id);
      if (error) throw error;
      if (currentAdvance?.employee_id) await rebuildEmployeeAdvanceBalances(currentAdvance.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Request deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePayroll = useMutation({
    mutationFn: async () => {
      if (!editingPayroll) return;
      const gross = parseFloat(payslipEditForm.gross_salary) || 0;
      const att = parseFloat(payslipEditForm.attendance_deduction) || 0;
      const adv = parseFloat(payslipEditForm.advance_deduction) || 0;
      const tax = parseFloat(payslipEditForm.tax_deduction) || 0;
      const oth = parseFloat(payslipEditForm.other_deductions) || 0;
      const net = gross - att - adv - tax - oth;
      const { data, error } = await supabase
        .from('payroll')
        .update({
          gross_salary: gross,
          attendance_deduction: att,
          advance_deduction: adv,
          tax_deduction: tax,
          other_deductions: oth,
          net_salary: net,
          status: payslipEditForm.status,
          paid_at: payslipEditForm.status === 'paid' ? new Date().toISOString() : null,
        })
        .select('employee_id')
        .eq('id', editingPayroll.id)
        .single();
      if (error) throw error;
      if (data?.employee_id) await rebuildEmployeeAdvanceBalances(data.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payslip updated');
      setEditingPayroll(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePayroll = useMutation({
    mutationFn: async (id: string) => {
      const { data: currentPayroll, error: fetchError } = await supabase.from('payroll').select('employee_id').eq('id', id).single();
      if (fetchError) throw fetchError;
      const { error } = await supabase.from('payroll').delete().eq('id', id);
      if (error) throw error;
      if (currentPayroll?.employee_id) await rebuildEmployeeAdvanceBalances(currentPayroll.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast.success('Payslip deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEditAdvance = (advance: AdvanceRecord) => {
    setEditingAdvance(advance);
    setAdvanceForm({
      employee_id: advance.employee_id,
      amount: String(advance.amount ?? ''),
      purpose: (advance.purpose as Purpose) || '',
      others: advance.others || advance.reason || '',
      expense_date: advance.expense_date || format(new Date(), 'yyyy-MM-dd'),
      monthly_deduction: String(advance.monthly_deduction ?? ''),
    });
    setAdvanceOpen(true);
  };

  const openEditPayroll = (p: PayrollRecord) => {
    setEditingPayroll(p);
    setPayslipEditForm({
      gross_salary: String(p.gross_salary ?? ''),
      attendance_deduction: String(p.attendance_deduction ?? 0),
      advance_deduction: String(p.advance_deduction ?? 0),
      tax_deduction: String(p.tax_deduction ?? 0),
      other_deductions: String(p.other_deductions ?? 0),
      status: p.status || 'draft',
    });
  };

  const generatePayroll = useMutation({
    mutationFn: async () => {
      const month = parseInt(payrollForm.month);
      const year = parseInt(payrollForm.year);
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${month === 12 ? year + 1 : year}-${((month % 12) + 1).toString().padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();

      // Attendance for the month (only explicit overrides exist; unmarked = Present by default)
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .gte('date', startDate)
        .lt('date', endDate);

      const attendanceSummary = (attendanceData || []).reduce((acc, r: any) => {
        if (!acc[r.employee_id]) acc[r.employee_id] = { absent: 0, half_day: 0, on_leave: 0 };
        if (r.status === 'absent') acc[r.employee_id].absent++;
        else if (r.status === 'half_day') acc[r.employee_id].half_day++;
        else if (r.status === 'on_leave') acc[r.employee_id].on_leave++;
        return acc;
      }, {} as Record<string, { absent: number; half_day: number; on_leave: number }>);

      // Unpaid approved leave overlapping the month
      const { data: leaveData } = await supabase
        .from('leave_applications')
        .select('employee_id, start_date, end_date, total_days, leave_type:leave_types(is_paid)')
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .gte('end_date', startDate);

      const unpaidLeaveDays: Record<string, number> = {};
      (leaveData || []).forEach((l: any) => {
        if (l.leave_type?.is_paid === false) {
          unpaidLeaveDays[l.employee_id] = (unpaidLeaveDays[l.employee_id] || 0) + (Number(l.total_days) || 0);
        }
      });

      const breakdowns: Record<string, { absent: number; half: number; unpaid: number; daily: number }> = {};

      const payrollInserts = payrollForm.employee_ids.map((employeeId) => {
        const salaryStructure = salaryStructures.find((s) => s.employee_id === employeeId);
        if (!salaryStructure) throw new Error(`No salary structure found for employee ${employeeId}`);

        const att = attendanceSummary[employeeId] || { absent: 0, half_day: 0, on_leave: 0 };
        const unpaidLeave = unpaidLeaveDays[employeeId] ?? att.on_leave; // fallback: treat on_leave as unpaid
        const dailyRate = salaryStructure.basic_salary / daysInMonth;
        const attendanceDeduction =
          att.absent * dailyRate + att.half_day * dailyRate * 0.5 + unpaidLeave * dailyRate;

        const employeeAdvances = advances.filter(
          (a) => a.employee_id === employeeId && (a.status === 'repaying' || a.status === 'approved') && a.remaining_amount > 0,
        );
        const advanceDeduction = employeeAdvances.reduce(
          (sum, advance) => sum + Math.min(advance.monthly_deduction || advance.amount, advance.remaining_amount),
          0,
        );

        const grossSalary =
          salaryStructure.basic_salary +
          (salaryStructure.housing_allowance || 0) +
          (salaryStructure.transport_allowance || 0) +
          (salaryStructure.medical_allowance || 0) +
          (salaryStructure.other_allowances || 0);

        const totalDeductions =
          attendanceDeduction + advanceDeduction + (salaryStructure.tax_deduction || 0) + (salaryStructure.other_deductions || 0);

        breakdowns[employeeId] = { absent: att.absent, half: att.half_day, unpaid: unpaidLeave, daily: dailyRate };

        return {
          employee_id: employeeId,
          month,
          year,
          basic_salary: salaryStructure.basic_salary,
          gross_salary: grossSalary,
          attendance_deduction: attendanceDeduction,
          advance_deduction: advanceDeduction,
          tax_deduction: salaryStructure.tax_deduction || 0,
          other_deductions: salaryStructure.other_deductions || 0,
          net_salary: grossSalary - totalDeductions,
          status: 'pending',
        };
      });

      const { error } = await supabase.from('payroll').insert(payrollInserts);
      if (error) throw error;

      for (const employeeId of payrollForm.employee_ids) {
        const employeeAdvances = advances
      .filter((a) => a.employee_id === employeeId && (a.status === 'repaying' || a.status === 'approved') && a.remaining_amount > 0)
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
        for (const advance of employeeAdvances) {
          const deduction = Math.min(advance.monthly_deduction || advance.amount, advance.remaining_amount);
          const newRemaining = advance.remaining_amount - deduction;
          await supabase
            .from('advances')
            .update({ remaining_amount: newRemaining, status: newRemaining <= 0 ? 'completed' : advance.status })
            .eq('id', advance.id);
        }
        await rebuildEmployeeAdvanceBalances(employeeId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Payroll generated successfully');
      setPayrollOpen(false);
      setPayrollForm({
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString(),
        employee_ids: [],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderWorkflowActions = (advance: AdvanceRecord) => (
    <div className="flex flex-wrap gap-2">
      {advance.status === 'pending' && (
        <>
          <Button size="sm" variant="outline" onClick={() => updateAdvanceWorkflow.mutate({ id: advance.id, action: 'approved' })}>
            <Check className="mr-1 h-4 w-4 text-success" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateAdvanceWorkflow.mutate({ id: advance.id, action: 'rejected' })}>
            <X className="mr-1 h-4 w-4 text-destructive" /> Reject
          </Button>
        </>
      )}
      {advance.status !== 'repaying' && advance.status !== 'completed' && (
        <Button size="sm" onClick={() => updateAdvanceWorkflow.mutate({ id: advance.id, action: 'salary_deduction' })}>
          <ArrowRightLeft className="mr-1 h-4 w-4" /> Salary Deduction
        </Button>
      )}
      {isAdmin && (
        <>
          <Button size="sm" variant="outline" onClick={() => openEditAdvance(advance)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAdvance.mutate(advance.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );

  return (
    <DashboardLayout title="Payroll Management" subtitle="Manage salaries, employee advances, expenses, deductions, and statements.">
      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(`/payroll/${value}`)}
        className="space-y-6"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 overflow-x-auto bg-transparent p-0 sm:flex sm:w-auto sm:justify-start">
          <TabsTrigger value="salary" className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Salary Structures</TabsTrigger>
          <TabsTrigger value="advances" className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Employee Advances & Expenses</TabsTrigger>
          <TabsTrigger value="payslips" className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payslips</TabsTrigger>
          <TabsTrigger value="statements" className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Employee Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="salary" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Salary Structures</h2>
              <p className="text-sm text-muted-foreground">Current active salary packages used during payroll processing.</p>
            </div>
            <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Create Salary Structure</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Salary Structure</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-4">
                  <div className="grid gap-2">
                    <Label>Employee *</Label>
                    <Select value={salaryForm.employee_id} onValueChange={(v) => setSalaryForm({ ...salaryForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{employeeName(e)} ({e.employee_code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Basic Salary (OMR) *</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.basic_salary} onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Housing Allowance (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.housing_allowance} onChange={(e) => setSalaryForm({ ...salaryForm, housing_allowance: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Transport Allowance (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.transport_allowance} onChange={(e) => setSalaryForm({ ...salaryForm, transport_allowance: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Medical Allowance (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.medical_allowance} onChange={(e) => setSalaryForm({ ...salaryForm, medical_allowance: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Other Allowances (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.other_allowances} onChange={(e) => setSalaryForm({ ...salaryForm, other_allowances: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Tax Deduction (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.tax_deduction} onChange={(e) => setSalaryForm({ ...salaryForm, tax_deduction: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Other Deductions (OMR)</Label>
                      <Input type="number" min="0" step="0.01" value={salaryForm.other_deductions} onChange={(e) => setSalaryForm({ ...salaryForm, other_deductions: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Working Hours/Month</Label>
                      <Input type="number" min="1" value={salaryForm.working_hours_per_month} onChange={(e) => setSalaryForm({ ...salaryForm, working_hours_per_month: e.target.value })} />
                    </div>
                  </div>
                  <Button onClick={() => createSalaryStructure.mutate()} disabled={!salaryForm.employee_id || !salaryForm.basic_salary || createSalaryStructure.isPending} className="w-full">
                    Create Salary Structure
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Housing</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Medical</TableHead>
                    <TableHead>Other Allow.</TableHead>
                    <TableHead>Tax Ded.</TableHead>
                    <TableHead>Other Ded.</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryStructures.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No salary structures found</TableCell></TableRow>
                  ) : (
                    salaryStructures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{employeeName(s.employees)}</TableCell>
                        <TableCell>{formatCurrency(s.basic_salary)}</TableCell>
                        <TableCell>{formatCurrency(s.housing_allowance)}</TableCell>
                        <TableCell>{formatCurrency(s.transport_allowance)}</TableCell>
                        <TableCell>{formatCurrency(s.medical_allowance)}</TableCell>
                        <TableCell>{formatCurrency(s.other_allowances)}</TableCell>
                        <TableCell>{formatCurrency(s.tax_deduction)}</TableCell>
                        <TableCell>{formatCurrency(s.other_deductions)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency((s.basic_salary || 0) + (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0) + (s.other_allowances || 0) - (s.tax_deduction || 0) - (s.other_deductions || 0))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advances" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="flex items-center gap-4 p-5"><ClipboardList className="h-9 w-9 rounded-lg bg-warning/10 p-2 text-warning" /><div><p className="text-sm text-muted-foreground">Pending approvals</p><p className="text-2xl font-bold">{advanceSummary.pending}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><ReceiptText className="h-9 w-9 rounded-lg bg-success/10 p-2 text-success" /><div><p className="text-sm text-muted-foreground">Approved advances</p><p className="text-2xl font-bold">{formatCurrency(advanceSummary.approved)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><X className="h-9 w-9 rounded-lg bg-destructive/10 p-2 text-destructive" /><div><p className="text-sm text-muted-foreground">Rejected requests</p><p className="text-2xl font-bold">{formatCurrency(advanceSummary.rejected)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-4 p-5"><CircleDollarSign className="h-9 w-9 rounded-lg bg-primary/10 p-2 text-primary" /><div><p className="text-sm text-muted-foreground">Outstanding balance</p><p className="text-2xl font-bold">{formatCurrency(advanceSummary.outstanding)}</p></div></CardContent></Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Employee Advances & Expenses</h2>
              <p className="text-sm text-muted-foreground">Admin/HR can approve, reject, or move any request to payroll salary deduction.</p>
            </div>
            <Dialog open={advanceOpen} onOpenChange={(o) => { setAdvanceOpen(o); if (!o) { setEditingAdvance(null); setAdvanceForm({ employee_id: '', amount: '', purpose: '', others: '', expense_date: format(new Date(), 'yyyy-MM-dd'), monthly_deduction: '' }); } }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Request</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingAdvance ? 'Edit Request' : 'Employee Advances & Expenses'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-4">
                  <div className="grid gap-2">
                    <Label>Employee</Label>
                    <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm({ ...advanceForm, employee_id: v })} disabled={!!editingAdvance}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{employeeName(e)} ({e.employee_code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Purpose *</Label>
                    <Select value={advanceForm.purpose} onValueChange={(v) => setAdvanceForm({ ...advanceForm, purpose: v as Purpose })}>
                      <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Amount (OMR)</Label>
                      <Input type="number" min="0" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Expense Date *</Label>
                      <Input type="date" value={advanceForm.expense_date} onChange={(e) => setAdvanceForm({ ...advanceForm, expense_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Others</Label>
                    <Textarea value={advanceForm.others} onChange={(e) => setAdvanceForm({ ...advanceForm, others: e.target.value })} placeholder="Additional remarks / bill details" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Suggested Salary Deduction (OMR)</Label>
                    <Input type="number" min="0" value={advanceForm.monthly_deduction} onChange={(e) => setAdvanceForm({ ...advanceForm, monthly_deduction: e.target.value })} placeholder="Optional; defaults to full amount" />
                  </div>
                  <Button onClick={() => editingAdvance ? updateAdvance.mutate() : createAdvance.mutate()} disabled={!advanceForm.employee_id || !advanceForm.amount || !advanceForm.purpose || createAdvance.isPending || updateAdvance.isPending} className="w-full">
                    {editingAdvance ? 'Save Changes' : 'Submit Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>

          <Card className="hidden lg:block">
            <CardContent className="overflow-x-auto pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead><TableHead>Purpose</TableHead><TableHead>Expense Date</TableHead><TableHead>Amount</TableHead><TableHead>Monthly Deduction</TableHead><TableHead>Remaining</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No requests found</TableCell></TableRow> : advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{employeeName(advance.employees)}<div className="text-xs text-muted-foreground">{advance.employees?.employee_code}</div></TableCell>
                      <TableCell>{advance.purpose || advance.reason || 'Personal Advance'}<div className="max-w-56 truncate text-xs text-muted-foreground">{advance.others || advance.reason}</div></TableCell>
                      <TableCell>{(() => { const d = advance.expense_date || advance.created_at; const dt = d ? new Date(d) : null; return dt && !isNaN(dt.getTime()) ? format(dt, 'dd MMM yyyy') : '-'; })()}</TableCell>
                      <TableCell>{formatCurrency(advance.amount)}</TableCell>
                      <TableCell>{formatCurrency(advance.monthly_deduction)}</TableCell>
                      <TableCell>{formatCurrency(advance.remaining_amount)}</TableCell>
                      <TableCell><Badge className={statusClassName(advance.status || 'pending')}>{advance.status || 'pending'}</Badge></TableCell>
                      <TableCell>{renderWorkflowActions(advance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:hidden">
            {advances.length === 0 ? <Card><CardContent className="p-6 text-center text-muted-foreground">No requests found</CardContent></Card> : advances.map((advance) => (
              <Card key={advance.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{employeeName(advance.employees)}</p><p className="text-xs text-muted-foreground">{advance.employees?.employee_code} • {advance.purpose || 'Personal Advance'}</p></div>
                    <Badge className={statusClassName(advance.status || 'pending')}>{advance.status || 'pending'}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-sm"><div><p className="text-muted-foreground">Amount</p><p className="font-semibold">{formatCurrency(advance.amount)}</p></div><div><p className="text-muted-foreground">Deduct</p><p className="font-semibold">{formatCurrency(advance.monthly_deduction)}</p></div><div><p className="text-muted-foreground">Balance</p><p className="font-semibold">{formatCurrency(advance.remaining_amount)}</p></div></div>
                  {(advance.others || advance.reason) && <p className="text-sm text-muted-foreground">{advance.others || advance.reason}</p>}
                  {renderWorkflowActions(advance)}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payslips">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Payslips</h2>
              <p className="text-sm text-muted-foreground">Generate and manage monthly payroll for employees.</p>
            </div>
            <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Generate Payroll</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate Payroll</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Month</Label>
                      <Select value={payrollForm.month} onValueChange={(v) => setPayrollForm({ ...payrollForm, month: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {format(new Date(2024, i), 'MMMM')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Year</Label>
                      <Select value={payrollForm.year} onValueChange={(v) => setPayrollForm({ ...payrollForm, year: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 5 }, (_, i) => (
                            <SelectItem key={new Date().getFullYear() - 2 + i} value={(new Date().getFullYear() - 2 + i).toString()}>
                              {new Date().getFullYear() - 2 + i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Select Employees</Label>
                    <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={employee.id}
                            checked={payrollForm.employee_ids.includes(employee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPayrollForm({
                                  ...payrollForm,
                                  employee_ids: [...payrollForm.employee_ids, employee.id]
                                });
                              } else {
                                setPayrollForm({
                                  ...payrollForm,
                                  employee_ids: payrollForm.employee_ids.filter(id => id !== employee.id)
                                });
                              }
                            }}
                          />
                          <label htmlFor={employee.id} className="text-sm">
                            {employeeName(employee)} ({employee.employee_code})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button 
                    onClick={() => generatePayroll.mutate()} 
                    disabled={payrollForm.employee_ids.length === 0 || generatePayroll.isPending} 
                    className="w-full"
                  >
                    Generate Payroll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Recent Payslips</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net Salary</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>{payrolls.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No payslips found</TableCell></TableRow> : payrolls.map((p) => <TableRow key={p.id}><TableCell className="font-medium">{employeeName(p.employees)}</TableCell><TableCell>{format(new Date(p.year, p.month - 1), 'MMMM yyyy')}</TableCell><TableCell>{formatCurrency(p.gross_salary)}</TableCell><TableCell>{formatCurrency((p.attendance_deduction || 0) + (p.advance_deduction || 0) + (p.tax_deduction || 0) + (p.other_deductions || 0))}</TableCell><TableCell className="font-semibold">{formatCurrency(p.net_salary)}</TableCell><TableCell><Badge className={p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{p.status}</Badge></TableCell><TableCell><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setPrintPayslip(p)}><Printer className="h-4 w-4" /></Button>{isAdmin && <><Button size="sm" variant="outline" onClick={() => openEditPayroll(p)}><Pencil className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this payslip?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletePayroll.mutate(p.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>}</div></TableCell></TableRow>)}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Employee Statement</CardTitle><CardDescription>Complete employee ledger for advances, expenses, outstanding balances, and salary deductions.</CardDescription></div>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}><SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Filter employee" /></SelectTrigger><SelectContent><SelectItem value="all">All employees</SelectItem>{employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employeeName(employee)}</SelectItem>)}</SelectContent></Select>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-muted/80"><CardContent><p className="text-sm text-muted-foreground">Total Advances</p><p className="text-2xl font-semibold">{formatCurrency(selectedStatementRows.reduce((sum, statement) => sum + statement.totalAdvances, 0))}</p></CardContent></Card>
                <Card className="bg-muted/80"><CardContent><p className="text-sm text-muted-foreground">Total Recovered</p><p className="text-2xl font-semibold">{formatCurrency(selectedStatementRows.reduce((sum, statement) => sum + statement.totalRecovered, 0))}</p></CardContent></Card>
                <Card className="bg-muted/80"><CardContent><p className="text-sm text-muted-foreground">Outstanding Balance</p><p className="text-2xl font-semibold">{formatCurrency(selectedStatementRows.reduce((sum, statement) => sum + statement.outstandingBalance, 0))}</p></CardContent></Card>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Total Advances</TableHead><TableHead>Total Recovered</TableHead><TableHead>Outstanding</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>{selectedStatementRows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No employee statement available</TableCell></TableRow> : selectedStatementRows.map((statement) => {
                  const outstanding = statement.outstandingBalance;
                  return <TableRow key={statement.employee.id}><TableCell className="font-medium">{employeeName(statement.employee)}<div className="text-xs text-muted-foreground">{statement.requestCount} requests{statement.latestActivity ? ` • Latest ${format(new Date(statement.latestActivity), 'dd MMM yyyy')}` : ''}</div></TableCell><TableCell>{formatCurrency(statement.totalAdvances)}</TableCell><TableCell>{formatCurrency(statement.totalRecovered)}</TableCell><TableCell className={cn('font-semibold', outstanding > 0 ? 'text-destructive' : 'text-success')}>{formatCurrency(Math.abs(outstanding))} {outstanding > 0 ? 'recoverable' : 'payable'}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => setPrintStatementEmpId(statement.employee.id)}><Printer className="mr-1 h-4 w-4" />Print</Button></TableCell></TableRow>;
                })}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingPayroll} onOpenChange={(o) => { if (!o) setEditingPayroll(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Payslip</DialogTitle></DialogHeader>
          <div className="grid gap-4 pt-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Gross Salary (OMR)</Label>
                <Input type="number" min="0" step="0.01" value={payslipEditForm.gross_salary} onChange={(e) => setPayslipEditForm({ ...payslipEditForm, gross_salary: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={payslipEditForm.status} onValueChange={(v) => setPayslipEditForm({ ...payslipEditForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Attendance Deduction</Label>
                <Input type="number" min="0" step="0.01" value={payslipEditForm.attendance_deduction} onChange={(e) => setPayslipEditForm({ ...payslipEditForm, attendance_deduction: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Advance Deduction</Label>
                <Input type="number" min="0" step="0.01" value={payslipEditForm.advance_deduction} onChange={(e) => setPayslipEditForm({ ...payslipEditForm, advance_deduction: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tax Deduction</Label>
                <Input type="number" min="0" step="0.01" value={payslipEditForm.tax_deduction} onChange={(e) => setPayslipEditForm({ ...payslipEditForm, tax_deduction: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Other Deductions</Label>
                <Input type="number" min="0" step="0.01" value={payslipEditForm.other_deductions} onChange={(e) => setPayslipEditForm({ ...payslipEditForm, other_deductions: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => updatePayroll.mutate()} disabled={updatePayroll.isPending} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!printPayslip} onOpenChange={(o) => { if (!o) setPrintPayslip(null); }}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Payslip Preview</DialogTitle></DialogHeader>
          {printPayslip && (() => {
            const empAdvances = advances.filter((a) => a.employee_id === printPayslip.employee_id && (a.status === 'approved' || a.status === 'repaying'));
            const totalAdvances = empAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
            const payrollsUpToThisMonth = payrolls.filter((p) => p.employee_id === printPayslip.employee_id && (new Date(p.year, p.month - 1).getTime() <= new Date(printPayslip.year, printPayslip.month - 1).getTime()));
            const recoveredUpToThisMonth = payrollsUpToThisMonth.reduce((sum, p) => sum + (Number(p.advance_deduction) || 0), 0);
            const outstandingAtThisMonth = Math.max(totalAdvances - recoveredUpToThisMonth, 0);
            return (
              <PrintablePayslip
                payroll={printPayslip as any}
                salary={salaryStructures.find((s) => s.employee_id === printPayslip.employee_id) as any}
                outstandingAfter={outstandingAtThisMonth}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!printStatementEmpId} onOpenChange={(o) => { if (!o) setPrintStatementEmpId(null); }}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Statement of Account</DialogTitle></DialogHeader>
          {printStatementEmpId && (() => {
            const emp = employees.find((e) => e.id === printStatementEmpId);
            if (!emp) return null;
            return (
              <PrintableStatement
                employee={emp as any}
                advances={advances.filter((a) => a.employee_id === printStatementEmpId) as any}
                payrolls={payrolls.filter((p) => p.employee_id === printStatementEmpId) as any}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
