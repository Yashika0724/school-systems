import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { StudentAttendancePage } from '@/components/student/StudentAttendancePage';
import { StudentMarksPage } from '@/components/student/StudentMarksPage';
import { StudentHomeworkPage } from '@/components/student/StudentHomeworkPage';
import { StudentTimetablePage } from '@/components/student/StudentTimetablePage';

export default function StudentDashboard() {
  return (
    <DashboardLayout userType="student" sidebar={<StudentSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardContent isDemo={false} />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="marks" element={<StudentMarksPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="homework" element={<StudentHomeworkPage />} />
        <Route path="exams" element={<ComingSoonPage title="Examinations" />} />
        <Route path="fees" element={<ComingSoonPage title="Fee Details" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
