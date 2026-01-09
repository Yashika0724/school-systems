import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { AttendancePage } from '@/components/teacher/AttendancePage';
import { MarksEntryPage } from '@/components/teacher/MarksEntryPage';
import { HomeworkPage } from '@/components/teacher/HomeworkPage';

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
        <Route path="students" element={<ComingSoonPage title="Students" />} />
        <Route path="schedule" element={<ComingSoonPage title="Schedule" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
