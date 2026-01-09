import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

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
          <Route path="students" element={<ComingSoonPage title="Student Management" />} />
          <Route path="parents" element={<ComingSoonPage title="Parent Management" />} />
          <Route path="teachers" element={<ComingSoonPage title="Teacher Management" />} />
          <Route path="classes" element={<ComingSoonPage title="Class Management" />} />
          <Route path="fees" element={<ComingSoonPage title="Fee Configuration" />} />
          <Route path="reports" element={<ComingSoonPage title="Reports & Analytics" />} />
          <Route path="settings" element={<ComingSoonPage title="System Settings" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="admin" isDemo />
    </>
  );
}
