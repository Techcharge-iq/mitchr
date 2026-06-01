import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { LeaveApplication, LeaveType } from '@/types/hrms';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Check, X, Calendar } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function Leave() {
  const { user, userRole } = useAuth();
  const canManage = userRole === 'admin' || userRole === 'hr_staff' || userRole === 'manager';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const queryClient = useQueryClient();

  const { data: myEmployee } = useQuery({
    queryKey: ['my-employee', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: leaveApplications, isLoading } = useQuery({
    queryKey: ['leave-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          employee:employees!leave_applications_employee_id_fkey(id, first_name, last_name, email, employee_code, department:departments(name)),
          leave_type:leave_types(name, is_paid)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (LeaveApplication & {
        employee: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          employee_code: string;
          department: { name: string } | null;
        };
        leave_type: { name: string; is_paid: boolean } | null;
      })[];
    },
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as LeaveType[];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('employment_status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const createLeaveApplication = useMutation({
    mutationFn: async (data: typeof formData) => {
      const employee_id = canManage ? data.employee_id : myEmployee?.id;
      if (!employee_id) {
        throw new Error('Your account is not linked to an employee profile — please contact admin.');
      }
      if (!data.start_date || !data.end_date) {
        throw new Error('Start and end dates are required.');
      }
      const totalDays = differenceInDays(new Date(data.end_date), new Date(data.start_date)) + 1;
      if (totalDays <= 0) {
        throw new Error('End date must be on or after start date.');
      }

      const { error } = await supabase.from('leave_applications').insert([{
        employee_id,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
        total_days: totalDays,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      toast.success('Leave application submitted');
      setIsOpen(false);
      setFormData({
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('leave_applications')
        .update({
          status,
          approved_at: status === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      toast.success(`Leave ${status} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'cancelled':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const pendingApplications = leaveApplications?.filter((app) => app.status === 'pending') || [];
  const allApplications = leaveApplications || [];

  const filterBySearch = (apps: typeof allApplications) =>
    apps.filter((app) =>
      `${app.employee.first_name} ${app.employee.last_name} ${app.employee.employee_code}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

  const LeaveTable = ({ applications }: { applications: typeof allApplications }) => (
    <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                No leave applications found
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow key={app.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {app.employee.first_name[0]}
                        {app.employee.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {app.employee.first_name} {app.employee.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {app.employee.department?.name || '-'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{app.leave_type?.name || '-'}</p>
                    {app.leave_type?.is_paid && (
                      <span className="text-xs text-success">Paid</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(app.start_date), 'MMM d')} - {format(new Date(app.end_date), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{app.total_days}</span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {app.reason || '-'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('capitalize', getStatusColor(app.status))}
                  >
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {app.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                        onClick={() => updateLeaveStatus.mutate({ id: app.id, status: 'approved' })}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => updateLeaveStatus.mutate({ id: app.id, status: 'rejected' })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout title="Leave Management" subtitle="Manage employee leave applications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Leave Application
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
                <DialogDescription>
                  Submit a new leave application
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createLeaveApplication.mutate(formData);
                }}
                className="space-y-4 py-4"
              >
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select
                    value={formData.leave_type_id}
                    onValueChange={(value) => setFormData({ ...formData, leave_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} {type.is_paid ? '(Paid)' : '(Unpaid)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Briefly describe the reason for leave..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLeaveApplication.isPending}>
                    {createLeaveApplication.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Application
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pendingApplications.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {pendingApplications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Applications</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <LeaveTable applications={filterBySearch(pendingApplications)} />
            )}
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <LeaveTable applications={filterBySearch(allApplications)} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}