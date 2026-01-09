import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { ParentDashboardContent } from '@/components/parent/ParentDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

export default function ParentDemo() {
  const { setDemoMode } = useDemo();

  useEffect(() => {
    setDemoMode('parent');
  }, [setDemoMode]);

  return (
    <>
      <DashboardLayout userType="parent" sidebar={<ParentSidebar isDemo />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ParentDashboardContent isDemo />} />
          <Route path="attendance" element={<ComingSoonPage title="Children's Attendance" />} />
          <Route path="marks" element={<ComingSoonPage title="Marks & Reports" />} />
          <Route path="fees" element={<ComingSoonPage title="Fee Management" badge="Under Development" />} />
          <Route path="leaves" element={<ComingSoonPage title="Leave Applications" />} />
          <Route path="announcements" element={<ComingSoonPage title="Announcements" />} />
          <Route path="messages" element={<ComingSoonPage title="Contact Teachers" />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="parent" isDemo />
    </>
  );
}
