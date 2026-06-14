import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Employee, Department, Branch, EmploymentStatus, EmploymentHistory } from '@/types/hrms';
import { toast } from 'sonner';
import { Plus, Search, Filter, MoreHorizontal, Loader2, Pencil, Trash2, UserCog, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

type EmployeeForm = {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  designation: string;
  department_id: string;
  branch_id: string;
  contract_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  is_field_staff: boolean;
  account_number: string;
};

const emptyForm: EmployeeForm = {
  employee_code: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  designation: '',
  department_id: '',
  branch_id: '',
  contract_type: 'full_time',
  is_field_staff: false,
  account_number: '',
};

export default function Employees() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const isAdminOrHr = userRole === 'admin' || userRole === 'hr_staff';

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [statusEmp, setStatusEmp] = useState<Employee | null>(null);
  const [statusForm, setStatusForm] = useState<{ status: EmploymentStatus; reason: string }>({ status: 'active', reason: '' });
  const [historyEmp, setHistoryEmp] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<EmployeeForm>(emptyForm);

  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`*, department:departments(name), branch:branches(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Employee & { department: { name: string } | null; branch: { name: string } | null })[];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      return data as Department[];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*');
      if (error) throw error;
      return data as Branch[];
    },
  });

  const resetForm = () => setFormData(emptyForm);

  const createEmployee = useMutation({
    mutationFn: async (data: EmployeeForm) => {
      const { error } = await supabase.from('employees').insert([{
        ...data,
        department_id: data.department_id || null,
        branch_id: data.branch_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully');
      setIsOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeForm }) => {
      const { error } = await supabase.from('employees').update({
        ...data,
        department_id: data.department_id || null,
        branch_id: data.branch_id || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
      setEditing(null);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted');
      setDeleting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setFormData({
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || '',
      designation: emp.designation || '',
      department_id: emp.department_id || '',
      branch_id: emp.branch_id || '',
      contract_type: (emp.contract_type as EmployeeForm['contract_type']) || 'full_time',
      is_field_staff: !!emp.is_field_staff,
      account_number: emp.account_number || '',
    });
  };

  const filteredEmployees = employees?.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.employee_code}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'on_leave': return 'bg-warning/10 text-warning border-warning/20';
      case 'holiday': return 'bg-primary/10 text-primary border-primary/20';
      case 'resigned': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'terminated': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'suspended': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: EmploymentStatus; reason: string }) => {
      const { error } = await supabase.from('employees').update({ employment_status: status }).eq('id', id);
      if (error) throw error;
      if (reason) {
        // Update the latest open history row with the reason (trigger just inserted it)
        const { data: latest } = await supabase
          .from('employment_history')
          .select('id')
          .eq('employee_id', id)
          .is('end_date', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.id) await supabase.from('employment_history').update({ reason }).eq('id', latest.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Status updated');
      setStatusEmp(null);
      setStatusForm({ status: 'active', reason: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: historyRows = [], isLoading: historyLoading } = useQuery({
    queryKey: ['employment-history', historyEmp?.id],
    enabled: !!historyEmp,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employment_history')
        .select('*')
        .eq('employee_id', historyEmp!.id)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data as EmploymentHistory[];
    },
  });

  const renderEmployeeForm = (onSubmit: () => void, submitting: boolean, label: string) => (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_code">Employee Code *</Label>
          <Input id="employee_code" value={formData.employee_code} onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Account Number</Label>
          <Input value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Designation</Label>
          <Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select value={formData.branch_id} onValueChange={(v) => setFormData({ ...formData, branch_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contract Type</Label>
          <Select value={formData.contract_type} onValueChange={(v: EmployeeForm['contract_type']) => setFormData({ ...formData, contract_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.is_field_staff} onChange={(e) => setFormData({ ...formData, is_field_staff: e.target.checked })} className="h-4 w-4 rounded border-border" />
            <span className="text-sm">Field Staff (GPS Tracking)</span>
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditing(null); resetForm(); }}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{label}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <DashboardLayout title="Employees" subtitle="Manage your organization's workforce">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
            {isAdminOrHr && (
              <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>Enter the employee details below</DialogDescription>
                  </DialogHeader>
                  {renderEmployeeForm(() => createEmployee.mutate(formData), createEmployee.isPending, 'Add Employee')}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : filteredEmployees?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No employees found</TableCell></TableRow>
              ) : (
                filteredEmployees?.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{employee.first_name[0]}{employee.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><code className="rounded bg-muted px-2 py-1 text-sm">{employee.employee_code}</code></TableCell>
                    <TableCell>{employee.department?.name || '-'}</TableCell>
                    <TableCell>{employee.branch?.name || '-'}</TableCell>
                    <TableCell>{employee.designation || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', getStatusColor(employee.employment_status))}>
                        {employee.employment_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isAdminOrHr && (
                            <DropdownMenuItem onClick={() => openEdit(employee)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {isAdminOrHr && (
                            <DropdownMenuItem onClick={() => { setStatusEmp(employee); setStatusForm({ status: employee.employment_status, reason: '' }); }}>
                              <UserCog className="mr-2 h-4 w-4" /> Change Status
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setHistoryEmp(employee)}>
                            <History className="mr-2 h-4 w-4" /> View History
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setDeleting(employee)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update the employee details below</DialogDescription>
          </DialogHeader>
          {editing && renderEmployeeForm(
            () => updateEmployee.mutate({ id: editing.id, data: formData }),
            updateEmployee.isPending,
            'Save Changes'
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleting?.first_name} {deleting?.last_name} and related records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteEmployee.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change status dialog */}
      <Dialog open={!!statusEmp} onOpenChange={(o) => { if (!o) setStatusEmp(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusEmp && (statusEmp.employment_status === 'resigned' || statusEmp.employment_status === 'terminated') && statusForm.status === 'active'
                ? 'Rejoin Employee'
                : 'Change Employment Status'}
            </DialogTitle>
            <DialogDescription>
              {statusEmp?.first_name} {statusEmp?.last_name} ({statusEmp?.employee_code})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={statusForm.status} onValueChange={(v: EmploymentStatus) => setStatusForm({ ...statusForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <Input
                value={statusForm.reason}
                onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                placeholder="e.g. Rejoined after resignation, Annual holiday, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusEmp(null)}>Cancel</Button>
            <Button
              onClick={() => statusEmp && updateStatus.mutate({ id: statusEmp.id, status: statusForm.status, reason: statusForm.reason })}
              disabled={updateStatus.isPending || (statusEmp?.employment_status === statusForm.status)}
            >
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyEmp} onOpenChange={(o) => { if (!o) setHistoryEmp(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employment History</DialogTitle>
            <DialogDescription>
              {historyEmp?.first_name} {historyEmp?.last_name} ({historyEmp?.employee_code})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : historyRows.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No history yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize', getStatusColor(h.status))}>
                          {h.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{h.effective_date ? format(new Date(h.effective_date), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>{h.end_date ? format(new Date(h.end_date), 'dd MMM yyyy') : <span className="text-muted-foreground">Current</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
