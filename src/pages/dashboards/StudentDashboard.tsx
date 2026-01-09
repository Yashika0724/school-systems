import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

export default function StudentDashboard() {
  return (
    <DashboardLayout userType="student" sidebar={<StudentSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardContent isDemo={false} />} />
        <Route path="attendance" element={<ComingSoonPage title="Attendance" />} />
        <Route path="marks" element={<ComingSoonPage title="Marks & Results" />} />
        <Route path="timetable" element={<ComingSoonPage title="Timetable" />} />
        <Route path="homework" element={<ComingSoonPage title="Homework" />} />
        <Route path="exams" element={<ComingSoonPage title="Examinations" />} />
        <Route path="fees" element={<ComingSoonPage title="Fee Details" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
