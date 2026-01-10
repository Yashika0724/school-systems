import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { FeeManagement } from '@/components/admin/FeeManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { AdminReports } from '@/components/admin/AdminReports';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { ExamManagement } from '@/components/admin/ExamManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { TimetableManagement } from '@/components/admin/TimetableManagement';
import { AttendanceManagement } from '@/components/admin/AttendanceManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { LibraryManagement } from '@/components/admin/LibraryManagement';
import { TransportManagement } from '@/components/admin/TransportManagement';

export default function AdminDemo() {
  const { setDemoMode } = useDemo();

  useEffect(() => {
    setDemoMode('admin');
  }, [setDemoMode]);

  return (
    <>
      <DashboardLayout userType="admin" sidebar={<AdminSidebar isDemo />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardContent isDemo />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="students" element={<UserManagement defaultTab="students" />} />
          <Route path="parents" element={<UserManagement defaultTab="parents" />} />
          <Route path="teachers" element={<UserManagement defaultTab="teachers" />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="timetable" element={<TimetableManagement />} />
          <Route path="attendance" element={<AttendanceManagement />} />
          <Route path="announcements" element={<AnnouncementManagement />} />
          <Route path="exams" element={<ExamManagement />} />
          <Route path="fees" element={<FeeManagement />} />
          <Route path="library" element={<LibraryManagement />} />
          <Route path="transport" element={<TransportManagement />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<SystemSettings />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="admin" isDemo />
    </>
  );
}
