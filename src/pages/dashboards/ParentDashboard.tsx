import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';
import { ParentDashboardContent } from '@/components/parent/ParentDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';

export default function ParentDashboard() {
  return (
    <DashboardLayout userType="parent" sidebar={<ParentSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboardContent isDemo={false} />} />
        <Route path="children" element={<ComingSoonPage title="My Children" />} />
        <Route path="attendance" element={<ComingSoonPage title="Attendance" />} />
        <Route path="marks" element={<ComingSoonPage title="Academic Progress" />} />
        <Route path="fees" element={<ComingSoonPage title="Fee Payments" />} />
        <Route path="messages" element={<ComingSoonPage title="Messages" />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
