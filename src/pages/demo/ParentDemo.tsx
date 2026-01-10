import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { ParentDashboardContent } from '@/components/parent/ParentDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { ParentFeePage } from '@/components/parent/ParentFeePage';
import { ParentAttendancePage } from '@/components/parent/ParentAttendancePage';
import { ParentMarksPage } from '@/components/parent/ParentMarksPage';
import { ParentHomeworkPage } from '@/components/parent/ParentHomeworkPage';
import { ParentMessagesPage } from '@/components/parent/ParentMessagesPage';
import { ParentLeavePage } from '@/components/parent/ParentLeavePage';

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
          <Route path="attendance" element={<ParentAttendancePage />} />
          <Route path="marks" element={<ParentMarksPage />} />
          <Route path="homework" element={<ParentHomeworkPage />} />
          <Route path="fees" element={<ParentFeePage />} />
          <Route path="messages" element={<ParentMessagesPage />} />
          <Route path="leaves" element={<ParentLeavePage />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="parent" isDemo />
    </>
  );
}
