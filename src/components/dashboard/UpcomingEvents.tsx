import { Calendar, Gift, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const events = [
  {
    id: 1,
    title: 'Team Meeting',
    date: 'Dec 10, 2025',
    time: '10:00 AM',
    type: 'meeting',
    icon: Users,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 2,
    title: "Ali Hassan's Birthday",
    date: 'Dec 12, 2025',
    time: 'All Day',
    type: 'birthday',
    icon: Gift,
    color: 'bg-accent/10 text-accent',
  },
  {
    id: 3,
    title: 'Quaid-e-Azam Day',
    date: 'Dec 25, 2025',
    time: 'Holiday',
    type: 'holiday',
    icon: Calendar,
    color: 'bg-success/10 text-success',
  },
];

export function UpcomingEvents() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <h3 className="text-lg font-semibold text-card-foreground">Upcoming Events</h3>
      <div className="mt-4 space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-background p-4"
          >
            <div className={cn('rounded-lg p-2', event.color)}>
              <event.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-card-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">
                {event.date} • {event.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}