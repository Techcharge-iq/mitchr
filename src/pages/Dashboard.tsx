import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AttendanceOverview } from '@/components/dashboard/AttendanceOverview';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { Users, Clock, Calendar, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [employees, departments, branches] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact' }),
        supabase.from('departments').select('id', { count: 'exact' }),
        supabase.from('branches').select('id', { count: 'exact' }),
      ]);
      
      return {
        totalEmployees: employees.count || 0,
        departments: departments.count || 0,
        branches: branches.count || 0,
      };
    },
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: async () => {
      const { count } = await supabase
        .from('leave_applications')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');
      return count || 0;
    },
  });

  const { data: pendingAdvances } = useQuery({
    queryKey: ['pending-advances'],
    queryFn: async () => {
      const { count } = await supabase
        .from('advances')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');
      return count || 0;
    },
  });

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back! Here's what's happening today.">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatCard
          title="Present Today"
          value="85%"
          change="142 of 167 employees"
          changeType="neutral"
          icon={Clock}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves || 0}
          change="Requires attention"
          changeType="neutral"
          icon={Calendar}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
        <StatCard
          title="Pending Advances"
          value={pendingAdvances || 0}
          change="Awaiting approval"
          changeType="neutral"
          icon={Wallet}
          iconColor="text-accent"
          iconBgColor="bg-accent/10"
        />
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AttendanceOverview />
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <UpcomingEvents />
          
          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="text-lg font-semibold text-card-foreground">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Add Employee</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <Clock className="h-6 w-6 text-success" />
                <span className="text-sm font-medium">Mark Attendance</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <Wallet className="h-6 w-6 text-accent" />
                <span className="text-sm font-medium">Process Payroll</span>
              </button>
              <button className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted">
                <TrendingUp className="h-6 w-6 text-warning" />
                <span className="text-sm font-medium">View Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}