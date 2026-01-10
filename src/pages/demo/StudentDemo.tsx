import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { StudentFeePage } from '@/components/student/StudentFeePage';
import { StudentAttendancePage } from '@/components/student/StudentAttendancePage';
import { StudentMarksPage } from '@/components/student/StudentMarksPage';
import { StudentTimetablePage } from '@/components/student/StudentTimetablePage';
import { StudentHomeworkPage } from '@/components/student/StudentHomeworkPage';
import { StudentAnnouncementsPage } from '@/components/student/StudentAnnouncementsPage';
import { StudentLeavePage } from '@/components/student/StudentLeavePage';

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
          <Route path="attendance" element={<StudentAttendancePage />} />
          <Route path="marks" element={<StudentMarksPage />} />
          <Route path="timetable" element={<StudentTimetablePage />} />
          <Route path="homework" element={<StudentHomeworkPage />} />
          <Route path="announcements" element={<StudentAnnouncementsPage />} />
          <Route path="leaves" element={<StudentLeavePage />} />
          <Route path="fees" element={<StudentFeePage />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="student" isDemo />
    </>
  );
}
