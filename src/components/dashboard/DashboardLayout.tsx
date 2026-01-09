import { ReactNode } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { useDemo } from '@/contexts/DemoContext';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'student' | 'parent' | 'teacher' | 'admin';
  sidebar: ReactNode;
}

export function DashboardLayout({ children, userType, sidebar }: DashboardLayoutProps) {
  const { isDemo } = useDemo();

  return (
    <div className={`min-h-screen theme-${userType}`}>
      {isDemo && <DemoBanner userType={userType} />}
      
      <div className="flex h-[calc(100vh-theme(spacing.10))]" style={{ height: isDemo ? 'calc(100vh - 40px)' : '100vh' }}>
        {/* Sidebar - hidden on mobile for student/parent/teacher, always visible for admin */}
        <aside className={`${userType === 'admin' ? 'hidden md:flex' : 'hidden lg:flex'} w-64 flex-col border-r bg-card`}>
          {sidebar}
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
