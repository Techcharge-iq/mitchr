import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, Calendar, Wallet, MapPin, FileDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

export default function Reports() {
  const { data: employeeStats } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('employment_status, contract_type, department_id');
      if (error) throw error;
      
      const byStatus: Record<string, number> = {};
      const byContract: Record<string, number> = {};
      data.forEach((e) => {
        byStatus[e.employment_status || 'unknown'] = (byStatus[e.employment_status || 'unknown'] || 0) + 1;
        byContract[e.contract_type || 'unknown'] = (byContract[e.contract_type || 'unknown'] || 0) + 1;
      });

      return {
        total: data.length,
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
        byContract: Object.entries(byContract).map(([name, value]) => ({ name: name.replace('_', ' '), value })),
      };
    },
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('attendance').select('status').eq('date', today);
      if (error) throw error;
      
      const stats: Record<string, number> = {};
      data.forEach((a) => {
        stats[a.status || 'unknown'] = (stats[a.status || 'unknown'] || 0) + 1;
      });

      return Object.entries(stats).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
    },
  });

  const { data: leaveStats } = useQuery({
    queryKey: ['leave-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_applications').select('status');
      if (error) throw error;
      
      const stats: Record<string, number> = {};
      data.forEach((l) => {
        stats[l.status || 'unknown'] = (stats[l.status || 'unknown'] || 0) + 1;
      });

      return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: departmentStats } = useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data: depts } = await supabase.from('departments').select('id, name');
      const { data: emps } = await supabase.from('employees').select('department_id');
      
      const counts: Record<string, number> = {};
      emps?.forEach((e) => {
        if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1;
      });

      return depts?.map((d) => ({ name: d.name, employees: counts[d.id] || 0 })).filter((d) => d.employees > 0) || [];
    },
  });

  const reports = [
    { title: 'Employee Report', description: 'Detailed employee headcount and demographics', icon: Users },
    { title: 'Attendance Report', description: 'Daily, weekly, and monthly attendance summary', icon: Clock },
    { title: 'Leave Report', description: 'Leave utilization and balance report', icon: Calendar },
    { title: 'Payroll Report', description: 'Salary disbursement and deductions summary', icon: Wallet },
    { title: 'GPS Activity Report', description: 'Field staff movement and location history', icon: MapPin },
  ];

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="View insights and download reports">
      {/* Quick Reports */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
        {reports.map((report) => (
          <Card key={report.title} className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <report.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
                <Button size="sm" variant="outline" className="mt-2 gap-2">
                  <FileDown className="h-4 w-4" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Employees by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="employees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={attendanceStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {attendanceStats?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Leave Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leaveStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {leaveStats?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Employees by Contract Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={employeeStats?.byContract} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
