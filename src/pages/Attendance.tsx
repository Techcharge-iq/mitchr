import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Attendance as AttendanceType } from '@/types/hrms';
import { toast } from 'sonner';
import { Search, Calendar, Clock, MapPin, Loader2, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function Attendance() {
  const { userRole } = useAuth();
  const canManage = userRole === 'admin' || userRole === 'hr_staff';
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(id, first_name, last_name, email, employee_code, department:departments(name))
        `)
        .eq('date', selectedDate)
        .order('check_in', { ascending: false });
      
      if (error) throw error;
      return data as (AttendanceType & {
        employee: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          employee_code: string;
          department: { name: string } | null;
        };
      })[];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-for-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, department:departments(name)')
        .eq('employment_status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const markAttendance = useMutation({
    mutationFn: async ({ employeeId, status }: { employeeId: string; status: string }) => {
      const { error } = await supabase.from('attendance').upsert({
        employee_id: employeeId,
        date: selectedDate,
        status: status as any,
        check_in: status === 'present' ? new Date().toISOString() : null,
      }, {
        onConflict: 'employee_id,date',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const markAllPresent = useMutation({
    mutationFn: async () => {
      if (!employees?.length) return;
      const nowIso = new Date().toISOString();
      const rows = employees.map((e) => ({
        employee_id: e.id,
        date: selectedDate,
        status: 'present' as any,
        check_in: nowIso,
      }));
      const { error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'employee_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('All employees marked present');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-success/10 text-success border-success/20';
      case 'absent':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'half_day':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'on_leave':
        return 'bg-info/10 text-info border-info/20';
      case 'holiday':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Merge: when admin/HR, show every active employee for the date even if not yet marked.
  const mergedRows = (() => {
    if (!canManage) return attendance ?? [];
    const byEmp = new Map((attendance ?? []).map((a) => [a.employee.id, a]));
    return (employees ?? []).map((emp) => {
      const existing = byEmp.get(emp.id);
      if (existing) return existing;
      return {
        id: `placeholder-${emp.id}`,
        employee_id: emp.id,
        date: selectedDate,
        status: 'not_marked' as any,
        check_in: null,
        check_out: null,
        overtime_minutes: 0,
        check_in_latitude: null,
        check_in_longitude: null,
        employee: {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: '',
          employee_code: emp.employee_code,
          department: emp.department as any,
        },
      } as any;
    });
  })();

  const filteredAttendance = mergedRows.filter((record: any) =>
    `${record.employee.first_name} ${record.employee.last_name} ${record.employee.employee_code}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );


  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'hh:mm a');
  };

  return (
    <DashboardLayout title="Attendance" subtitle="Track and manage employee attendance">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <Clock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold">
                  {attendance?.filter((a) => a.status === 'present').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold">
                  {attendance?.filter((a) => a.status === 'absent').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Half Day</p>
                <p className="text-2xl font-bold">
                  {attendance?.filter((a) => a.status === 'half_day').length || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 card-shadow">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-info/10 p-2">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold">
                  {attendance?.filter((a) => a.status === 'on_leave').length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredAttendance?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No attendance records for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance?.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {record.employee.first_name[0]}
                            {record.employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {record.employee.first_name} {record.employee.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.employee.employee_code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{record.employee.department?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTime(record.check_in)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTime(record.check_out)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', getStatusColor(record.status))}
                      >
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.overtime_minutes > 0 ? (
                        <span className="text-sm font-medium text-success">
                          +{Math.floor(record.overtime_minutes / 60)}h {record.overtime_minutes % 60}m
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {record.check_in_latitude && record.check_in_longitude ? (
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <MapPin className="h-3 w-3" />
                          View
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}