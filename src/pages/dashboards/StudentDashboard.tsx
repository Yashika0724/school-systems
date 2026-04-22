import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentSidebar } from '@/components/dashboard/StudentSidebar';
import { StudentDashboardContent } from '@/components/student/StudentDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { StudentAttendancePage } from '@/components/student/StudentAttendancePage';
import { StudentMarksPage } from '@/components/student/StudentMarksPage';
import { StudentHomeworkPage } from '@/components/student/StudentHomeworkPage';
import { StudentTimetablePage } from '@/components/student/StudentTimetablePage';
import { StudentFeePage } from '@/components/student/StudentFeePage';
import { StudentAnnouncementsPage } from '@/components/student/StudentAnnouncementsPage';
import { StudentLeavePage } from '@/components/student/StudentLeavePage';
import { StudentExamsPage } from '@/components/student/StudentExamsPage';
import { StudentLibraryPage } from '@/components/student/StudentLibraryPage';
import { StudentTransportPage } from '@/components/student/StudentTransportPage';
import { StudentPaymentPage } from '@/components/student/StudentPaymentPage';
import { StudentResourcesPage } from '@/components/student/StudentResourcesPage';
import { StudentHallTicketPage } from '@/components/student/StudentHallTicketPage';
import { StudentReportCardPage } from '@/components/student/StudentReportCardPage';
import { StudentOnlineExamsPage } from '@/components/student/StudentOnlineExamsPage';
import { StudentOnlineAttemptPage } from '@/components/student/StudentOnlineAttemptPage';
import { StudentRemedialPage } from '@/components/student/StudentRemedialPage';
import { StudentReevalPage } from '@/components/student/StudentReevalPage';
import { StudentBadgesPage } from '@/components/student/StudentBadgesPage';
import { StudentMessagesPage } from '@/components/student/StudentMessagesPage';
import { NotificationsInboxPage } from '@/components/notifications/NotificationsInboxPage';

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
        <Route path="exams" element={<StudentExamsPage />} />
        <Route path="hall-tickets" element={<StudentHallTicketPage />} />
        <Route path="online-exams" element={<StudentOnlineExamsPage />} />
        <Route path="online-exams/:onlineExamId/attempt" element={<StudentOnlineAttemptPage />} />
        <Route path="remedial" element={<StudentRemedialPage />} />
        <Route path="reeval" element={<StudentReevalPage />} />
        <Route path="badges" element={<StudentBadgesPage />} />
        <Route path="report-card" element={<StudentReportCardPage />} />
        <Route path="fees" element={<StudentFeePage />} />
        <Route path="payments" element={<StudentPaymentPage />} />
        <Route path="library" element={<StudentLibraryPage />} />
        <Route path="transport" element={<StudentTransportPage />} />
        <Route path="announcements" element={<StudentAnnouncementsPage />} />
        <Route path="leave" element={<StudentLeavePage />} />
        <Route path="resources" element={<StudentResourcesPage />} />
        <Route path="messages" element={<StudentMessagesPage />} />
        <Route path="notifications" element={<NotificationsInboxPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
