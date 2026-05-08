import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, Calendar, Wallet, MapPin, FileDown, TrendingUp, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];
const MONTH_ORDER: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};
const CATEGORIES = ['Food', 'Petrol', 'Personal Advance', 'Office Expenses'];

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .eq('employment_status', 'active')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: expenseStats } = useQuery({
    queryKey: ['expense-stats', selectedYear, selectedEmployees],
    queryFn: async () => {
      let query = supabase
        .from('advances')
        .select('amount, purpose, expense_date, status, employee_id, created_at, employees(first_name, last_name)')
        .in('status', ['approved', 'rejected']);

      if (selectedEmployees.length > 0) {
        query = query.in('employee_id', selectedEmployees);
      }

      const { data, error } = await query;
      if (error) throw error;

      const yearNum = parseInt(selectedYear, 10);
      const monthlyData: Record<string, Record<string, number>> = {};
      const categoryData: Record<string, number> = {};
      let totalApproved = 0;
      let totalRejected = 0;

      data?.forEach((expense: any) => {
        const raw = expense.expense_date || expense.created_at;
        const dt = raw ? new Date(raw) : null;
        if (!dt || isNaN(dt.getTime())) return;
        if (dt.getFullYear() !== yearNum) return;

        const month = dt.toLocaleString('default', { month: 'short' });
        const category = expense.purpose || 'Personal Advance';
        const amount = Number(expense.amount) || 0;

        if (expense.status === 'approved') {
          if (!monthlyData[month]) monthlyData[month] = {};
          monthlyData[month][category] = (monthlyData[month][category] || 0) + amount;
          categoryData[category] = (categoryData[category] || 0) + amount;
          totalApproved += amount;
        }
        if (expense.status === 'rejected') {
          totalRejected += amount;
        }
      });

      const monthlyChartData = Object.entries(monthlyData)
        .sort(([a], [b]) => (MONTH_ORDER[a] || 0) - (MONTH_ORDER[b] || 0))
        .map(([month, categories]) => ({
          month,
          ...categories,
          Total: Object.values(categories).reduce((sum, value) => sum + value, 0),
        }));

      const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
        name,
        value,
      }));

      return {
        monthly: monthlyChartData,
        categories: categoryChartData,
        total: totalApproved,
        totalApproved,
        totalRejected,
      };
    },
  });

  const reports = [
    { title: 'Employee Report', description: 'Detailed employee headcount and demographics', icon: Users },
    { title: 'Attendance Report', description: 'Daily, weekly, and monthly attendance summary', icon: Clock },
    { title: 'Leave Report', description: 'Leave utilization and balance report', icon: Calendar },
    { title: 'Payroll Report', description: 'Salary disbursement and deductions summary', icon: Wallet },
    { title: 'Expense Report', description: 'Monthly spending analysis by category and employee', icon: TrendingUp },
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

      {/* Expense Reports */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Expense Reports
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Label>Year:</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => (
                      <SelectItem key={new Date().getFullYear() - 2 + i} value={(new Date().getFullYear() - 2 + i).toString()}>
                        {new Date().getFullYear() - 2 + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Employees:</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={employee.id}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEmployees([...selectedEmployees, employee.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                          }
                        }}
                      />
                      <Label htmlFor={employee.id} className="text-sm">
                        {employee.first_name} {employee.last_name}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedEmployees.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedEmployees([])}>
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[.2em] text-muted-foreground">Approved Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">OMR {expenseStats?.totalApproved?.toLocaleString() || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[.2em] text-muted-foreground">Rejected Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">OMR {expenseStats?.totalRejected?.toLocaleString() || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-[.2em] text-muted-foreground">Total Approved Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">OMR {expenseStats?.total?.toLocaleString() || 0}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseStats?.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`OMR ${value}`, '']} />
                      <Bar dataKey="Food" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="Petrol" stackId="a" fill="hsl(var(--success))" />
                      <Bar dataKey="Personal Advance" stackId="a" fill="hsl(var(--warning))" />
                      <Bar dataKey="Office Expenses" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Spending by Category</CardTitle>
                  <p className="text-sm text-muted-foreground">Total: OMR {expenseStats?.total?.toLocaleString() || 0}</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseStats?.categories}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: OMR ${value}`}
                      >
                        {expenseStats?.categories?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`OMR ${value}`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Total Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expenseStats?.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`OMR ${value}`, '']} />
                    <Line type="monotone" dataKey="Total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2">Month</th>
                      {CATEGORIES.map((category) => (
                        <th key={category} className="px-3 py-2">{category}</th>
                      ))}
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseStats?.monthly?.length ? expenseStats.monthly.map((row) => {
                      const total = CATEGORIES.reduce((sum, category) => sum + (row[category] || 0), 0);
                      return (
                        <tr key={row.month} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{row.month}</td>
                          {CATEGORIES.map((category) => (
                            <td key={`${row.month}-${category}`} className="px-3 py-2">OMR {(row[category] || 0).toLocaleString()}</td>
                          ))}
                          <td className="px-3 py-2 font-semibold">OMR {total.toLocaleString()}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={CATEGORIES.length + 2} className="px-3 py-6 text-center text-muted-foreground">No expense data available for the selected year or employees.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
