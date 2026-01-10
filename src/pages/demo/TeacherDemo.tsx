import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import { useDemo } from '@/contexts/DemoContext';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { TeacherClassesPage } from '@/components/teacher/TeacherClassesPage';
import { AttendancePage } from '@/components/teacher/AttendancePage';
import { MarksEntryPage } from '@/components/teacher/MarksEntryPage';
import { HomeworkPage } from '@/components/teacher/HomeworkPage';
import { TeacherAnnouncementsPage } from '@/components/teacher/TeacherAnnouncementsPage';
import { TeacherLeavePage } from '@/components/teacher/TeacherLeavePage';
import { TeacherSchedulePage } from '@/components/teacher/TeacherSchedulePage';

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
          <Route path="classes" element={<TeacherClassesPage />} />
          <Route path="schedule" element={<TeacherSchedulePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="marks" element={<MarksEntryPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="announcements" element={<TeacherAnnouncementsPage />} />
          <Route path="leaves" element={<TeacherLeavePage />} />
          <Route path="profile" element={<ComingSoonPage title="My Profile" />} />
        </Routes>
      </DashboardLayout>
      <MobileNav userType="teacher" isDemo />
    </>
  );
}
