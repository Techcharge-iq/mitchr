import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  Wallet,
  FileText,
  MapPin,
  Target,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Organization',
    icon: Building2,
    children: [
      { name: 'Departments', href: '/departments' },
      { name: 'Branches', href: '/branches' },
    ],
  },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'GPS Tracking', href: '/gps-tracking', icon: MapPin },
  { name: 'Leave', href: '/leave', icon: Calendar },
  {
    name: 'Payroll',
    icon: Wallet,
    children: [
      { name: 'Salary Structures', href: '/payroll/salary' },
      { name: 'Employee Advances & Expenses', href: '/payroll/advances' },
      { name: 'Employee Statements', href: '/payroll/statements' },
      { name: 'Payslips', href: '/payroll/payslips' },
    ],
  },
  { name: 'Performance', href: '/performance', icon: Target },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Announcements', href: '/announcements', icon: Bell },
  { name: 'User Management', href: '/user-management', icon: ShieldCheck, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>(location.pathname.startsWith('/payroll') ? ['Payroll'] : []);

  useEffect(() => {
    if (location.pathname.startsWith('/payroll')) {
      setOpenMenus((prev) => (prev.includes('Payroll') ? prev : [...prev, 'Payroll']));
    }
  }, [location.pathname]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  return (
    <aside className={cn("fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GitBranch className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">HRMS</h1>
            <p className="text-xs text-sidebar-foreground/60">Management System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) =>
            item.children ? (
              <Collapsible
                key={item.name}
                open={openMenus.includes(item.name)}
                onOpenChange={() => toggleMenu(item.name)}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      openMenus.includes(item.name) && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-11 pt-1">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.href}
                      to={child.href}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )
                      }
                    >
                      {child.name}
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </NavLink>
            )
          )}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => { onNavigate?.(); signOut(); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}