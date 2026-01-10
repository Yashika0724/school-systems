import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { StudentFeePage } from '@/components/student/StudentFeePage';

export default function StudentDemo() {
  const { setDemoMode } = useDemo();

  useEffect(() => {
    setDemoMode('student');
  }, [setDemoMode]);

  return (
    <>
      <DashboardLayout userType="student" sidebar={<StudentSidebar isDemo />}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboardContent isDemo />} />
          <Route path="attendance" element={<ComingSoonPage title="My Attendance" />} />
          <Route path="marks" element={<ComingSoonPage title="Marks & Reports" />} />
          <Route path="timetable" element={<ComingSoonPage title="Timetable" />} />
          <Route path="homework" element={<ComingSoonPage title="Homework" />} />
          <Route path="fees" element={<StudentFeePage />} />
          <Route path="announcements" element={<ComingSoonPage title="Announcements" />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="student" isDemo />
    </>
  );
}
