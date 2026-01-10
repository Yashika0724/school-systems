import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  CreditCard,
  BookOpen,
  MessageSquare,
  User,
  LogOut,
  CalendarDays,
  Library,
  Bus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { demoParent } from '@/lib/demo-data';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/parent/dashboard' },
  { icon: ClipboardCheck, label: 'Attendance', path: '/parent/attendance' },
  { icon: FileText, label: 'Marks', path: '/parent/marks' },
  { icon: BookOpen, label: 'Homework', path: '/parent/homework' },
  { icon: CreditCard, label: 'Fees', path: '/parent/fees' },
  { icon: Library, label: 'Library', path: '/parent/library' },
  { icon: Bus, label: 'Transport', path: '/parent/transport' },
  { icon: CalendarDays, label: 'Leave Requests', path: '/parent/leaves' },
  { icon: MessageSquare, label: 'Messages', path: '/parent/messages' },
  { icon: User, label: 'Profile', path: '/parent/profile' },
];

const demoNavItems = navItems.map(item => ({
  ...item,
  path: item.path.replace('/parent/', '/demo/parent/'),
}));

interface ParentSidebarProps {
  isDemo?: boolean;
}

export function ParentSidebar({ isDemo = false }: ParentSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { exitDemoMode } = useDemo();
  
  const items = isDemo ? demoNavItems : navItems;
  const basePath = isDemo ? '/demo/parent' : '/parent';

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
          <div className="h-10 w-10 rounded-xl bg-parent-gradient flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Parent Portal</h2>
            <p className="text-xs text-muted-foreground">
              {isDemo ? demoParent.name : 'Welcome'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
