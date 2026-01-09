import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { AttendancePage } from '@/components/teacher/AttendancePage';
import { MarksEntryPage } from '@/components/teacher/MarksEntryPage';
import { HomeworkPage } from '@/components/teacher/HomeworkPage';
import { SessionPlanningPage } from '@/components/teacher/SessionPlanningPage';
import { TeacherSchedulePage } from '@/components/teacher/TeacherSchedulePage';
import { TeacherAnnouncementsPage } from '@/components/teacher/TeacherAnnouncementsPage';

export default function TeacherDashboard() {
  return (
    <DashboardLayout userType="teacher" sidebar={<TeacherSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboardContent isDemo={false} />} />
        <Route path="classes" element={<ComingSoonPage title="My Classes" />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="marks" element={<MarksEntryPage />} />
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="sessions" element={<SessionPlanningPage />} />
        <Route path="schedule" element={<TeacherSchedulePage />} />
        <Route path="announcements" element={<TeacherAnnouncementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
