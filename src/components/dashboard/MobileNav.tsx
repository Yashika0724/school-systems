import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  BookOpen,
  User,
  Users,
  CreditCard,
  Bell,
  Calendar,
  PenTool,
  GraduationCap,
  School,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserType = 'student' | 'parent' | 'teacher' | 'admin';

const navConfigs: Record<UserType, { icon: any; label: string; path: string }[]> = {
  student: [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: FileText, label: 'Marks', path: '/marks' },
    { icon: BookOpen, label: 'Homework', path: '/homework' },
    { icon: User, label: 'Profile', path: '/profile' },
  ],
  parent: [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: CreditCard, label: 'Fees', path: '/fees' },
    { icon: Bell, label: 'Updates', path: '/announcements' },
    { icon: User, label: 'Profile', path: '/profile' },
  ],
  teacher: [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: Users, label: 'Classes', path: '/classes' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
    { icon: PenTool, label: 'Homework', path: '/homework' },
    { icon: User, label: 'Profile', path: '/profile' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: GraduationCap, label: 'Students', path: '/students' },
    { icon: BookOpen, label: 'Teachers', path: '/teachers' },
    { icon: School, label: 'Classes', path: '/classes' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ],
};

interface MobileNavProps {
  userType: UserType;
  isDemo?: boolean;
}

export function MobileNav({ userType, isDemo = false }: MobileNavProps) {
  const location = useLocation();
  const basePrefix = isDemo ? `/demo/${userType}` : `/${userType}`;
  const items = navConfigs[userType];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-card border-t z-50 ${userType === 'admin' ? 'md:hidden' : 'lg:hidden'}`}>
      <div className="flex justify-around items-center h-16">
        {items.map((item) => {
          const fullPath = `${basePrefix}${item.path}`;
          const isActive = location.pathname === fullPath ||
            (item.path === '/dashboard' && location.pathname === basePrefix);
          
          return (
            <Link
              key={item.path}
              to={fullPath}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 mb-1', isActive && 'text-primary')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
