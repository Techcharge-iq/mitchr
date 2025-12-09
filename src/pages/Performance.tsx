import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Star, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Performance() {
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ employee_id: '', title: '', description: '', target_value: '', unit: 'units' });
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, first_name, last_name').eq('employment_status', 'active');
      if (error) throw error;
      return data;
    },
  });

  const { data: goals } = useQuery({
    queryKey: ['performance-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('performance_goals').select(`*, employees(first_name, last_name)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('performance_reviews').select(`*, employees(first_name, last_name)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('performance_goals').insert({
        employee_id: goalForm.employee_id,
        title: goalForm.title,
        description: goalForm.description,
        target_value: parseFloat(goalForm.target_value) || null,
        unit: goalForm.unit,
        status: 'in_progress',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast.success('Goal added');
      setGoalOpen(false);
      setGoalForm({ employee_id: '', title: '', description: '', target_value: '', unit: 'units' });
    },
    onError: () => toast.error('Failed to add goal'),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'in_progress': return 'bg-primary/10 text-primary';
      case 'not_started': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout title="Performance Management" subtitle="Track goals and conduct performance reviews">
      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="goals" className="gap-2"><Target className="h-4 w-4" /> Goals & Targets</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2"><Star className="h-4 w-4" /> Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="flex justify-end mb-4">
            <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Goal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Performance Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={goalForm.employee_id} onValueChange={(v) => setGoalForm({ ...goalForm, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees?.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Goal Title</Label>
                    <Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g. Monthly Sales Target" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} placeholder="Goal details" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Target Value</Label>
                      <Input type="number" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })} placeholder="100" />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} placeholder="units, %, sales" />
                    </div>
                  </div>
                  <Button onClick={() => addGoal.mutate()} disabled={!goalForm.employee_id || !goalForm.title} className="w-full">
                    Add Goal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals?.length === 0 ? (
              <p className="text-muted-foreground col-span-full">No goals found. Create your first goal!</p>
            ) : (
              goals?.map((goal: any) => {
                const progress = goal.target_value ? ((goal.current_value || 0) / goal.target_value) * 100 : 0;
                return (
                  <Card key={goal.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{goal.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{goal.employees?.first_name} {goal.employees?.last_name}</p>
                        </div>
                        <Badge className={statusColor(goal.status)}>{goal.status?.replace('_', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{goal.description || 'No description'}</p>
                      {goal.target_value && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{goal.current_value || 0} / {goal.target_value} {goal.unit}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Goals Achieved</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No reviews found</TableCell></TableRow>
                  ) : (
                    reviews?.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                        <TableCell>{r.review_period || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            <span>{r.rating?.toFixed(1) || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{r.goals_achieved || 0} / {r.goals_total || 0}</TableCell>
                        <TableCell>{format(new Date(r.created_at), 'MMM dd, yyyy')}</TableCell>
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
