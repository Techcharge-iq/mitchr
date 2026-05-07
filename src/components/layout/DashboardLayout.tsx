import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar className="hidden md:block" />
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed left-3 top-3 z-40 md:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground">
          <AppSidebar className="relative z-auto block h-full w-full" onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="md:pl-64">
        <AppHeader title={title} subtitle={subtitle} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
