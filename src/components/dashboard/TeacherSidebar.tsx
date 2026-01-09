import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  PenTool,
  Bell,
  Calendar,
  User,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { demoTeacher } from '@/lib/demo-data';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: Users, label: 'My Classes', path: '/teacher/classes' },
  { icon: ClipboardCheck, label: 'Attendance', path: '/teacher/attendance' },
  { icon: FileText, label: 'Marks Entry', path: '/teacher/marks' },
  { icon: PenTool, label: 'Homework', path: '/teacher/homework' },
  { icon: Bell, label: 'Announcements', path: '/teacher/announcements' },
  { icon: Calendar, label: 'Leave Requests', path: '/teacher/leaves' },
  { icon: User, label: 'My Profile', path: '/teacher/profile' },
];

const demoNavItems = navItems.map(item => ({
  ...item,
  path: item.path.replace('/teacher/', '/demo/teacher/'),
}));

interface TeacherSidebarProps {
  isDemo?: boolean;
}

export function TeacherSidebar({ isDemo = false }: TeacherSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { exitDemoMode } = useDemo();
  
  const items = isDemo ? demoNavItems : navItems;
  const basePath = isDemo ? '/demo/teacher' : '/teacher';

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
          <div className="h-10 w-10 rounded-xl bg-teacher-gradient flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Teacher Portal</h2>
            <p className="text-xs text-muted-foreground">
              {isDemo ? demoTeacher.name : 'Welcome'}
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
