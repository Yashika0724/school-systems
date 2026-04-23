import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type UserRole = 'student' | 'parent' | 'teacher' | 'admin' | 'driver' | 'conductor';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: UserRole;
}

const roleLoginPaths: Record<UserRole, string> = {
  student: '/login/student',
  parent: '/login/parent',
  teacher: '/login/teacher',
  admin: '/login/admin',
  driver: '/driver',
  conductor: '/driver',
};

const roleDashboardPaths: Record<UserRole, string> = {
  student: '/student/dashboard',
  parent: '/parent/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
  driver: '/driver',
  conductor: '/driver',
};

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to appropriate login
  if (!user) {
    return <Navigate to={roleLoginPaths[allowedRole]} state={{ from: location }} replace />;
  }

  // User authenticated but role not yet loaded
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // User has wrong role - redirect to their correct dashboard
  if (userRole !== allowedRole) {
    return <Navigate to={roleDashboardPaths[userRole]} replace />;
  }

  // Authorized - render children
  return <>{children}</>;
}
