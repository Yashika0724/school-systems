import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';

export default function AdminDashboard() {
  return (
    <DashboardLayout userType="admin" sidebar={<AdminSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardContent isDemo={false} />} />
        <Route path="students" element={<UserManagement defaultTab="students" />} />
        <Route path="parents" element={<UserManagement defaultTab="parents" />} />
        <Route path="teachers" element={<UserManagement defaultTab="teachers" />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="fees" element={<ComingSoonPage title="Fee Configuration" />} />
        <Route path="reports" element={<ComingSoonPage title="Reports" />} />
        <Route path="settings" element={<ComingSoonPage title="Settings" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
