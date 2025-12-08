import { Clock, UserPlus, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'attendance',
    title: 'Ahmed Khan checked in',
    time: '2 minutes ago',
    icon: Clock,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    id: 2,
    type: 'employee',
    title: 'New employee added: Sarah Ali',
    time: '1 hour ago',
    icon: UserPlus,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 3,
    type: 'leave',
    title: 'Leave request approved for Bilal Ahmed',
    time: '3 hours ago',
    icon: Calendar,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
  },
  {
    id: 4,
    type: 'payroll',
    title: 'December payroll processed',
    time: '1 day ago',
    icon: DollarSign,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <h3 className="text-lg font-semibold text-card-foreground">Recent Activity</h3>
      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className={cn('rounded-lg p-2', activity.iconBg)}>
              <activity.icon className={cn('h-4 w-4', activity.iconColor)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}