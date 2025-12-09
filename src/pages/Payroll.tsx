import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Plus, FileText, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Payroll() {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, first_name, last_name, employee_code').eq('employment_status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const { data: salaryStructures } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salary_structures').select(`*, employees(first_name, last_name, employee_code)`).eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: advances } = useQuery({
    queryKey: ['advances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('advances').select(`*, employees(first_name, last_name, employee_code)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payrolls } = useQuery({
    queryKey: ['payrolls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll').select(`*, employees(first_name, last_name, employee_code)`).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const [advanceForm, setAdvanceForm] = useState({ employee_id: '', amount: '', monthly_deduction: '', reason: '' });

  const createAdvance = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('advances').insert({
        employee_id: advanceForm.employee_id,
        amount: parseFloat(advanceForm.amount),
        monthly_deduction: parseFloat(advanceForm.monthly_deduction),
        remaining_amount: parseFloat(advanceForm.amount),
        reason: advanceForm.reason,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Advance request submitted');
      setAdvanceOpen(false);
      setAdvanceForm({ employee_id: '', amount: '', monthly_deduction: '', reason: '' });
    },
    onError: () => toast.error('Failed to submit advance request'),
  });

  const updateAdvanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('advances').update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advances'] });
      toast.success('Status updated');
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'repaying': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout title="Payroll Management" subtitle="Manage salaries, advances, and payslips">
      <Tabs defaultValue="salary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="salary">Salary Structures</TabsTrigger>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
        </TabsList>

        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Salary Structures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Housing</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Medical</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryStructures?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No salary structures found</TableCell></TableRow>
                  ) : (
                    salaryStructures?.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.employees?.first_name} {s.employees?.last_name}</TableCell>
                        <TableCell>Rs. {s.basic_salary?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {s.housing_allowance?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {s.transport_allowance?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {s.medical_allowance?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">Rs. {(s.basic_salary + (s.housing_allowance || 0) + (s.transport_allowance || 0) + (s.medical_allowance || 0)).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advances">
          <div className="flex justify-end mb-4">
            <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Request Advance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Salary Advance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={advanceForm.employee_id} onValueChange={(v) => setAdvanceForm({ ...advanceForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (Rs.)</Label>
                    <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Monthly Deduction (Rs.)</Label>
                    <Input type="number" value={advanceForm.monthly_deduction} onChange={(e) => setAdvanceForm({ ...advanceForm, monthly_deduction: e.target.value })} />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input value={advanceForm.reason} onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })} />
                  </div>
                  <Button onClick={() => createAdvance.mutate()} disabled={!advanceForm.employee_id || !advanceForm.amount} className="w-full">
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Monthly Deduction</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No advances found</TableCell></TableRow>
                  ) : (
                    advances?.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.employees?.first_name} {a.employees?.last_name}</TableCell>
                        <TableCell>Rs. {a.amount?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {a.monthly_deduction?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {a.remaining_amount?.toLocaleString()}</TableCell>
                        <TableCell><Badge className={statusColor(a.status)}>{a.status}</Badge></TableCell>
                        <TableCell>
                          {a.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => updateAdvanceStatus.mutate({ id: a.id, status: 'approved' })}>
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateAdvanceStatus.mutate({ id: a.id, status: 'rejected' })}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Recent Payslips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No payslips found</TableCell></TableRow>
                  ) : (
                    payrolls?.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.employees?.first_name} {p.employees?.last_name}</TableCell>
                        <TableCell>{format(new Date(p.year, p.month - 1), 'MMMM yyyy')}</TableCell>
                        <TableCell>Rs. {p.gross_salary?.toLocaleString()}</TableCell>
                        <TableCell>Rs. {((p.attendance_deduction || 0) + (p.advance_deduction || 0) + (p.tax_deduction || 0)).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">Rs. {p.net_salary?.toLocaleString()}</TableCell>
                        <TableCell><Badge className={p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
