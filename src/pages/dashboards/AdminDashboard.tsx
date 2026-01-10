import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { TimetableManagement } from '@/components/admin/TimetableManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { AttendanceManagement } from '@/components/admin/AttendanceManagement';
import { FeeManagement } from '@/components/admin/FeeManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { AdminReports } from '@/components/admin/AdminReports';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { ExamManagement } from '@/components/admin/ExamManagement';

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
        <Route path="timetable" element={<TimetableManagement />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="announcements" element={<AnnouncementManagement />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="exams" element={<ExamManagement />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
