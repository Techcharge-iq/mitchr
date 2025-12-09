import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Users, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Branches() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', city: '', address: '' });
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: employeeCounts } = useQuery({
    queryKey: ['employee-counts-by-branch'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('branch_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e) => {
        if (e.branch_id) counts[e.branch_id] = (counts[e.branch_id] || 0) + 1;
      });
      return counts;
    },
  });

  const addBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('branches').insert(formData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch added successfully');
      setOpen(false);
      setFormData({ name: '', city: '', address: '' });
    },
    onError: () => toast.error('Failed to add branch'),
  });

  const deleteBranch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch deleted');
    },
    onError: () => toast.error('Cannot delete branch with employees'),
  });

  return (
    <DashboardLayout title="Branches" subtitle="Manage office locations and branches">
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Branch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Branch Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Main Office" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Karachi" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full address" />
              </div>
              <Button onClick={() => addBranch.mutate()} disabled={!formData.name} className="w-full">
                Add Branch
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : branches?.length === 0 ? (
          <p className="text-muted-foreground">No branches found</p>
        ) : (
          branches?.map((branch) => (
            <Card key={branch.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{branch.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteBranch.mutate(branch.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{branch.city || 'N/A'}, {branch.country}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{branch.address || 'No address'}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{employeeCounts?.[branch.id] || 0} employees</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
