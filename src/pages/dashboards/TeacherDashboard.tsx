import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeacherSidebar } from '@/components/dashboard/TeacherSidebar';
import { TeacherDashboardContent } from '@/components/teacher/TeacherDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

export default function TeacherDashboard() {
  return (
    <DashboardLayout userType="teacher" sidebar={<TeacherSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboardContent isDemo={false} />} />
        <Route path="classes" element={<ComingSoonPage title="My Classes" />} />
        <Route path="attendance" element={<ComingSoonPage title="Mark Attendance" />} />
        <Route path="marks" element={<ComingSoonPage title="Enter Marks" />} />
        <Route path="homework" element={<ComingSoonPage title="Homework" />} />
        <Route path="students" element={<ComingSoonPage title="Students" />} />
        <Route path="schedule" element={<ComingSoonPage title="Schedule" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
