import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Calendar,
  CalendarDays,
  BookOpen,
  CreditCard,
  Megaphone,
  User,
  LogOut,
  Library,
  Bus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { demoStudent } from '@/lib/demo-data';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
  { icon: ClipboardCheck, label: 'My Attendance', path: '/student/attendance' },
  { icon: FileText, label: 'Marks & Reports', path: '/student/marks' },
  { icon: Calendar, label: 'Timetable', path: '/student/timetable' },
  { icon: BookOpen, label: 'Homework', path: '/student/homework' },
  { icon: GraduationCap, label: 'Exams', path: '/student/exams' },
  { icon: CreditCard, label: 'Fee & Payments', path: '/student/fees' },
  { icon: Library, label: 'Library', path: '/student/library' },
  { icon: Bus, label: 'Transport', path: '/student/transport' },
  { icon: Megaphone, label: 'Announcements', path: '/student/announcements' },
  { icon: CalendarDays, label: 'Leave Requests', path: '/student/leave' },
  { icon: User, label: 'Profile', path: '/student/profile' },
];

const demoNavItems = navItems.map(item => ({
  ...item,
  path: item.path.replace('/student/', '/demo/student/'),
}));

interface StudentSidebarProps {
  isDemo?: boolean;
}

export function StudentSidebar({ isDemo = false }: StudentSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { exitDemoMode } = useDemo();
  
  const items = isDemo ? demoNavItems : navItems;
  const basePath = isDemo ? '/demo/student' : '/student';

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
          <div className="h-10 w-10 rounded-xl bg-student-gradient flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Student Portal</h2>
            <p className="text-xs text-muted-foreground">
              {isDemo ? demoStudent.name : 'Welcome'}
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
