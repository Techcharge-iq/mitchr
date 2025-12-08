import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Present', value: 85, color: 'hsl(var(--success))' },
  { name: 'Absent', value: 5, color: 'hsl(var(--destructive))' },
  { name: 'On Leave', value: 8, color: 'hsl(var(--warning))' },
  { name: 'Half Day', value: 2, color: 'hsl(var(--info))' },
];

export function AttendanceOverview() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <h3 className="text-lg font-semibold text-card-foreground">Today's Attendance</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}