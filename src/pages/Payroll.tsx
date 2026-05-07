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
  Plus,
  ReceiptText,
  Wallet,
  X,
} from 'lucide-react';
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
  basic_salary: number;
  housing_allowance: number | null;
  transport_allowance: number | null;
  medical_allowance: number | null;
  other_allowances: number | null;
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

const formatCurrency = (value?: number | null) => `Rs. ${(Number(value) || 0).toLocaleString()}`;
const employeeName = (employee?: EmployeeOption | null) => employee ? `${employee.first_name} ${employee.last_name}` : 'Unassigned employee';

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '',
    purpose: '' as Purpose | '',
    others: '',
    monthly_deduction: '',
  });
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
        const remaining = Number(advance.remaining_amount) || 0;
        if (advance.status === 'pending') acc.pending += 1;
        if (advance.status === 'approved') acc.approved += amount;
        if (advance.status === 'rejected') acc.rejected += amount;
        if (advance.status === 'repaying' || remaining > 0) acc.outstanding += remaining;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, outstanding: 0 },
    );
    return totals;
  }, [advances]);

  const employeeStatements = useMemo(() => employees.map((employee) => {
    const employeeAdvances = advances.filter((advance) => advance.employee_id === employee.id);
    const employeePayrolls = payrolls.filter((payroll) => payroll.employee_id === employee.id);

    return {
      employee,
      totalAdvances: employeeAdvances.reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0),
      approvedExpenses: employeeAdvances.filter((advance) => advance.status === 'approved').reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0),
      rejectedExpenses: employeeAdvances.filter((advance) => advance.status === 'rejected').reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0),
      outstandingBalance: employeeAdvances.reduce((sum, advance) => sum + (Number(advance.remaining_amount) || 0), 0),
      salaryDeductions: employeePayrolls.reduce((sum, payroll) => sum + (Number(payroll.advance_deduction) || 0), 0),
      latestActivity: employeeAdvances[0]?.created_at,
      requestCount: employeeAdvances.length,
    };
  }), [advances, employees, payrolls]);

  const selectedStatementRows = selectedEmployeeId === 'all'
    ? employeeStatements
    : employeeStatements.filter((statement) => statement.employee.id === selectedEmployeeId);

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
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Employee advance / expense request submitted');
      setAdvanceOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', purpose: '', others: '', monthly_deduction: '' });
    },
    onError: () => toast.error('Failed to submit request'),
  });

  const updateAdvanceWorkflow = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approved' | 'rejected' | 'salary_deduction' }) => {
      const payload = action === 'salary_deduction'
        ? { status: 'repaying' as const, start_deduction_date: format(new Date(), 'yyyy-MM-dd'), salary_adjusted_at: new Date().toISOString() }
        : { status: action, approved_at: action === 'approved' ? new Date().toISOString() : null, salary_adjusted_at: null };
      const { error } = await supabase.from('advances').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success(variables.action === 'salary_deduction' ? 'Moved to salary deduction' : 'Request status updated');
    },
    onError: () => toast.error('Failed to update request'),
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Salary Structures</CardTitle>
              <CardDescription>Current active salary packages used during payroll processing.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Housing</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Medical</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryStructures.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No salary structures found</TableCell></TableRow>
                  ) : (
                    salaryStructures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{employeeName(s.employees)}</TableCell>
                        <TableCell>{formatCurrency(s.basic_salary)}</TableCell>
                        <TableCell>{formatCurrency(s.housing_allowance)}</TableCell>
                        <TableCell>{formatCurrency(s.transport_allowance)}</TableCell>
                        <TableCell>{formatCurrency(s.medical_allowance)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency((s.basic_salary || 0) + (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0) + (s.other_allowances || 0))}</TableCell>
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
            <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Request</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Employee Advances & Expenses</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-4">
                  <div className="grid gap-2">
                    <Label>Employee</Label>
                    <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm({ ...advanceForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{employeeName(e)} ({e.employee_code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Amount (Rs.)</Label>
                      <Input type="number" min="0" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Purpose</Label>
                      <Select value={advanceForm.purpose} onValueChange={(v: Purpose) => setAdvanceForm({ ...advanceForm, purpose: v })}>
                        <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                        <SelectContent>{PURPOSES.map((purpose) => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Others</Label>
                    <Textarea value={advanceForm.others} onChange={(e) => setAdvanceForm({ ...advanceForm, others: e.target.value })} placeholder="Additional remarks / bill details" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Suggested Salary Deduction (Rs.)</Label>
                    <Input type="number" min="0" value={advanceForm.monthly_deduction} onChange={(e) => setAdvanceForm({ ...advanceForm, monthly_deduction: e.target.value })} placeholder="Optional; defaults to full amount" />
                  </div>
                  <Button onClick={() => createAdvance.mutate()} disabled={!advanceForm.employee_id || !advanceForm.amount || !advanceForm.purpose || createAdvance.isPending} className="w-full">
                    Submit Request
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
                    <TableHead>Employee</TableHead><TableHead>Purpose</TableHead><TableHead>Amount</TableHead><TableHead>Monthly Deduction</TableHead><TableHead>Remaining</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No requests found</TableCell></TableRow> : advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{employeeName(advance.employees)}<div className="text-xs text-muted-foreground">{advance.employees?.employee_code}</div></TableCell>
                      <TableCell>{advance.purpose || advance.reason || 'Personal Advance'}<div className="max-w-56 truncate text-xs text-muted-foreground">{advance.others || advance.reason}</div></TableCell>
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
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Recent Payslips</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net Salary</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{payrolls.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No payslips found</TableCell></TableRow> : payrolls.map((p) => <TableRow key={p.id}><TableCell className="font-medium">{employeeName(p.employees)}</TableCell><TableCell>{format(new Date(p.year, p.month - 1), 'MMMM yyyy')}</TableCell><TableCell>{formatCurrency(p.gross_salary)}</TableCell><TableCell>{formatCurrency((p.attendance_deduction || 0) + (p.advance_deduction || 0) + (p.tax_deduction || 0) + (p.other_deductions || 0))}</TableCell><TableCell className="font-semibold">{formatCurrency(p.net_salary)}</TableCell><TableCell><Badge className={p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{p.status}</Badge></TableCell></TableRow>)}</TableBody>
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
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Total Advances</TableHead><TableHead>Approved Expenses</TableHead><TableHead>Rejected Expenses</TableHead><TableHead>Salary Deductions</TableHead><TableHead>Outstanding</TableHead><TableHead>Remaining Payable / Recoverable</TableHead></TableRow></TableHeader>
                <TableBody>{selectedStatementRows.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No employee statement available</TableCell></TableRow> : selectedStatementRows.map((statement) => {
                  const remaining = statement.outstandingBalance - statement.salaryDeductions;
                  return <TableRow key={statement.employee.id}><TableCell className="font-medium">{employeeName(statement.employee)}<div className="text-xs text-muted-foreground">{statement.requestCount} requests{statement.latestActivity ? ` • Latest ${format(new Date(statement.latestActivity), 'dd MMM yyyy')}` : ''}</div></TableCell><TableCell>{formatCurrency(statement.totalAdvances)}</TableCell><TableCell>{formatCurrency(statement.approvedExpenses)}</TableCell><TableCell>{formatCurrency(statement.rejectedExpenses)}</TableCell><TableCell>{formatCurrency(statement.salaryDeductions)}</TableCell><TableCell>{formatCurrency(statement.outstandingBalance)}</TableCell><TableCell className={cn('font-semibold', remaining > 0 ? 'text-destructive' : 'text-success')}>{formatCurrency(Math.abs(remaining))} {remaining > 0 ? 'recoverable' : 'payable'}</TableCell></TableRow>;
                })}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
