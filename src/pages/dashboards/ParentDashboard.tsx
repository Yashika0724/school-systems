import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ParentSidebar } from '@/components/dashboard/ParentSidebar';
import { ParentDashboardContent } from '@/components/parent/ParentDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { ComingSoonPage } from '@/components/shared/ComingSoonPage';
import { ParentAttendancePage } from '@/components/parent/ParentAttendancePage';
import { ParentMarksPage } from '@/components/parent/ParentMarksPage';
import { ParentHomeworkPage } from '@/components/parent/ParentHomeworkPage';
import { ParentFeePage } from '@/components/parent/ParentFeePage';
import { ParentLeavePage } from '@/components/parent/ParentLeavePage';
import { ParentMessagesPage } from '@/components/parent/ParentMessagesPage';
import { ParentLibraryPage } from '@/components/parent/ParentLibraryPage';
import { ParentTransportPage } from '@/components/parent/ParentTransportPage';

export default function ParentDashboard() {
  return (
    <DashboardLayout userType="parent" sidebar={<ParentSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboardContent isDemo={false} />} />
        <Route path="children" element={<ComingSoonPage title="My Children" />} />
        <Route path="attendance" element={<ParentAttendancePage />} />
        <Route path="marks" element={<ParentMarksPage />} />
        <Route path="homework" element={<ParentHomeworkPage />} />
        <Route path="fees" element={<ParentFeePage />} />
        <Route path="library" element={<ParentLibraryPage />} />
        <Route path="transport" element={<ParentTransportPage />} />
        <Route path="leaves" element={<ParentLeavePage />} />
        <Route path="messages" element={<ParentMessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
