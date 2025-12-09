import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Navigation, Clock, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function GPSTracking() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const { data: fieldStaff } = useQuery({
    queryKey: ['field-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, first_name, last_name, employee_code').eq('is_field_staff', true).eq('employment_status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const { data: gpsLogs } = useQuery({
    queryKey: ['gps-logs', selectedEmployee],
    queryFn: async () => {
      let query = supabase.from('gps_logs').select(`*, employees(first_name, last_name, employee_code)`).order('recorded_at', { ascending: false }).limit(100);

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: lastLocations } = useQuery({
    queryKey: ['last-locations'],
    queryFn: async () => {
      // Get last location for each field staff
      const locations: Record<string, any> = {};
      if (fieldStaff) {
        for (const staff of fieldStaff) {
          const { data } = await supabase.from('gps_logs').select('*').eq('employee_id', staff.id).order('recorded_at', { ascending: false }).limit(1).single();
          if (data) {
            locations[staff.id] = { ...data, employee: staff };
          }
        }
      }
      return Object.values(locations);
    },
    enabled: !!fieldStaff,
  });

  return (
    <DashboardLayout title="GPS Tracking" subtitle="Track field staff locations in real-time">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fieldStaff?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Field Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-success/10">
                <Navigation className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lastLocations?.filter((l: any) => l.is_moving)?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Currently Moving</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-warning/10">
                <MapPin className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lastLocations?.filter((l: any) => !l.is_moving)?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Stationary</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent/10">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gpsLogs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Logs Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Locations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Live Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!lastLocations || lastLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No GPS data available. Field staff locations will appear here once they start tracking.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lastLocations.map((loc: any) => (
                <div key={loc.id} className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{loc.employee?.first_name} {loc.employee?.last_name}</p>
                      <p className="text-sm text-muted-foreground">{loc.employee?.employee_code}</p>
                    </div>
                    <Badge className={loc.is_moving ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                      {loc.is_moving ? 'Moving' : 'Stationary'}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {loc.latitude?.toFixed(6)}, {loc.longitude?.toFixed(6)}
                    </p>
                    {loc.speed && (
                      <p className="flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        {loc.speed?.toFixed(1)} km/h
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(loc.recorded_at), 'hh:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Route History</CardTitle>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {fieldStaff?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gpsLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No GPS logs found</TableCell>
                </TableRow>
              ) : (
                gpsLogs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.employees?.first_name} {log.employees?.last_name}</TableCell>
                    <TableCell className="font-mono text-sm">{log.latitude?.toFixed(6)}, {log.longitude?.toFixed(6)}</TableCell>
                    <TableCell>{log.speed?.toFixed(1) || 0} km/h</TableCell>
                    <TableCell>
                      <Badge className={log.is_moving ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {log.is_moving ? 'Moving' : 'Stationary'}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.battery_level ? `${log.battery_level}%` : '-'}</TableCell>
                    <TableCell>{format(new Date(log.recorded_at), 'hh:mm:ss a')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
