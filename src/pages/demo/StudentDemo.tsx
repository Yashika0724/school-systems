import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { StudentFeePage } from '@/components/student/StudentFeePage';
import { StudentAttendancePage } from '@/components/student/StudentAttendancePage';
import { StudentMarksPage } from '@/components/student/StudentMarksPage';
import { StudentTimetablePage } from '@/components/student/StudentTimetablePage';
import { StudentHomeworkPage } from '@/components/student/StudentHomeworkPage';
import { StudentAnnouncementsPage } from '@/components/student/StudentAnnouncementsPage';
import { StudentLeavePage } from '@/components/student/StudentLeavePage';
import { StudentExamsPage } from '@/components/student/StudentExamsPage';
import { StudentLibraryPage } from '@/components/student/StudentLibraryPage';
import { StudentTransportPage } from '@/components/student/StudentTransportPage';
import { StudentPaymentPage } from '@/components/student/StudentPaymentPage';
import { ProfilePage } from '@/components/profile/ProfilePage';

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
          <Route path="exams" element={<StudentExamsPage isDemo />} />
          <Route path="announcements" element={<StudentAnnouncementsPage />} />
          <Route path="leave" element={<StudentLeavePage />} />
          <Route path="fees" element={<StudentFeePage />} />
          <Route path="payments" element={<StudentPaymentPage />} />
          <Route path="library" element={<StudentLibraryPage />} />
          <Route path="transport" element={<StudentTransportPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="student" isDemo />
    </>
  );
}
