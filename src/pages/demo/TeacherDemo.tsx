import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

export default function TeacherDemo() {
  const { setDemoMode } = useDemo();

  useEffect(() => {
    setDemoMode('teacher');
  }, [setDemoMode]);

  return (
    <>
      <DashboardLayout userType="teacher" sidebar={<TeacherSidebar isDemo />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboardContent isDemo />} />
          <Route path="classes" element={<ComingSoonPage title="My Classes" />} />
          <Route path="attendance" element={<ComingSoonPage title="Mark Attendance" />} />
          <Route path="marks" element={<ComingSoonPage title="Marks Entry" />} />
          <Route path="homework" element={<ComingSoonPage title="Homework & Assignments" />} />
          <Route path="announcements" element={<ComingSoonPage title="Announcements" />} />
          <Route path="leaves" element={<ComingSoonPage title="Leave Requests" />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="teacher" isDemo />
    </>
  );
}
