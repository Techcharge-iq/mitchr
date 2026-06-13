import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2, Bell, Shield, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, userRole } = useAuth();
  const [notifications, setNotifications] = useState({ email: true, push: false, leave: true, payroll: true });
  const [companySettings, setCompanySettings] = useState({
    companyName: '',
    industry: '',
    workingHoursPerMonth: '300',
    currency: 'OMR',
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const settingsStorageKey = user ? `company-settings-${user.id}` : 'company-settings-guest';

  useEffect(() => {
    if (!user) return;
    try {
      const stored = window.localStorage.getItem(settingsStorageKey);
      if (stored) {
        setCompanySettings(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Unable to load company settings from storage', error);
    }
  }, [settingsStorageKey, user]);

  const handleSaveCompanySettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingCompany(true);
    try {
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(companySettings));
      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Failed to save company settings', error);
      toast.error('Unable to save company settings');
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your account and system preferences">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{user?.email}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{userRole || 'Employee'}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input value={userRole || 'Employee'} disabled className="capitalize" />
                </div>
              </div>

              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>Configure organization-wide settings</CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveCompanySettings} className="space-y-6">
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companySettings.companyName}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={companySettings.industry}
                      onChange={(e) => setCompanySettings({ ...companySettings, industry: e.target.value })}
                      placeholder="e.g. Sales & Distribution"
                    />
                  </div>
                  <div>
                    <Label htmlFor="working-hours">Working Hours (per month)</Label>
                    <Input
                      id="working-hours"
                      type="number"
                      value={companySettings.workingHoursPerMonth}
                      onChange={(e) => setCompanySettings({ ...companySettings, workingHoursPerMonth: e.target.value })}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={companySettings.currency}
                      onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSavingCompany}>
                  Save Changes
                </Button>
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Leave Request Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified about leave requests</p>
                  </div>
                  <Switch checked={notifications.leave} onCheckedChange={(v) => setNotifications({ ...notifications, leave: v })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payroll Reminders</p>
                    <p className="text-sm text-muted-foreground">Monthly payroll processing reminders</p>
                  </div>
                  <Switch checked={notifications.payroll} onCheckedChange={(v) => setNotifications({ ...notifications, payroll: v })} />
                </div>
              </div>

              <Button onClick={handleSave}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>

              <Button onClick={handleSave}>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
