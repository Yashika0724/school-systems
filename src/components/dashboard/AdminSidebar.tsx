import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  School,
  Calendar,
  ClipboardCheck,
  Megaphone,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { demoAdmin } from '@/lib/demo-data';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: GraduationCap, label: 'Students', path: '/admin/students' },
  { icon: Users, label: 'Parents', path: '/admin/parents' },
  { icon: BookOpen, label: 'Teachers', path: '/admin/teachers' },
  { icon: School, label: 'Classes', path: '/admin/classes' },
  { icon: Calendar, label: 'Timetable', path: '/admin/timetable' },
  { icon: ClipboardCheck, label: 'Attendance', path: '/admin/attendance' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
  { icon: CreditCard, label: 'Fee Management', path: '/admin/fees' },
];

const demoNavItems = navItems.map(item => ({
  ...item,
  path: item.path.replace('/admin/', '/demo/admin/'),
}));

interface AdminSidebarProps {
  isDemo?: boolean;
}

export function AdminSidebar({ isDemo = false }: AdminSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { exitDemoMode } = useDemo();
  
  const items = isDemo ? demoNavItems : navItems;
  const basePath = isDemo ? '/demo/admin' : '/admin';

  const handleLogout = () => {
    if (isDemo) {
      exitDemoMode();
    } else {
      signOut();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-admin-gradient flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Admin Portal</h2>
            <p className="text-xs text-muted-foreground">
              {isDemo ? demoAdmin.name : 'Welcome'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === `${basePath}/dashboard` && location.pathname === basePath);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {isDemo ? 'Exit Demo' : 'Logout'}
        </Button>
      </div>
    </div>
  );
}
