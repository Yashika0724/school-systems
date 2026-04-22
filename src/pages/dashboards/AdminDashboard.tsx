import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminSidebar } from '@/components/dashboard/AdminSidebar';
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassManagement } from '@/components/admin/ClassManagement';
import { TimetableManagement } from '@/components/admin/TimetableManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { AttendanceManagement } from '@/components/admin/AttendanceManagement';
import { AttendanceAnalyticsPage } from '@/components/admin/AttendanceAnalyticsPage';
import { AttendanceSettingsPage } from '@/components/admin/AttendanceSettingsPage';
import { AttendanceHolidaysPage } from '@/components/admin/AttendanceHolidaysPage';
import { AttendanceBulkImportPage } from '@/components/admin/AttendanceBulkImportPage';
import { AdmissionsQueuePage } from '@/components/admin/AdmissionsQueuePage';
import { AdmissionsSettingsPage } from '@/components/admin/AdmissionsSettingsPage';
import { FeeManagement } from '@/components/admin/FeeManagement';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { AdminReports } from '@/components/admin/AdminReports';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { ExamManagement } from '@/components/admin/ExamManagement';
import { GradingScalesPage } from '@/components/admin/GradingScalesPage';
import { ResultWorkflowPage } from '@/components/admin/ResultWorkflowPage';
import { EligibilityRulesPage } from '@/components/admin/EligibilityRulesPage';
import { SeatAllocationPage } from '@/components/admin/SeatAllocationPage';
import { ExamAnalyticsPage } from '@/components/admin/ExamAnalyticsPage';
import { ProctorConsolePage } from '@/components/admin/ProctorConsolePage';
import { ReevalQueuePage } from '@/components/admin/ReevalQueuePage';
import { LibraryManagement } from '@/components/admin/LibraryManagement';
import { TransportManagement } from '@/components/admin/TransportManagement';
import { NotificationsInboxPage } from '@/components/notifications/NotificationsInboxPage';
import { NotificationComposerPage } from '@/components/notifications/NotificationComposerPage';
import { AdminMessagesPage } from '@/components/admin/AdminMessagesPage';

export default function AdminDashboard() {
  return (
    <DashboardLayout userType="admin" sidebar={<AdminSidebar />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardContent isDemo={false} />} />
        <Route path="students" element={<UserManagement defaultTab="students" />} />
        <Route path="parents" element={<UserManagement defaultTab="parents" />} />
        <Route path="teachers" element={<UserManagement defaultTab="teachers" />} />
        <Route path="classes" element={<ClassManagement />} />
        <Route path="timetable" element={<TimetableManagement />} />
        <Route path="attendance" element={<AttendanceManagement />} />
        <Route path="attendance/analytics" element={<AttendanceAnalyticsPage />} />
        <Route path="attendance/settings" element={<AttendanceSettingsPage />} />
        <Route path="attendance/holidays" element={<AttendanceHolidaysPage />} />
        <Route path="attendance/import" element={<AttendanceBulkImportPage />} />
        <Route path="admissions" element={<AdmissionsQueuePage />} />
        <Route path="admissions/settings" element={<AdmissionsSettingsPage />} />
        <Route path="announcements" element={<AnnouncementManagement />} />
        <Route path="fees" element={<FeeManagement />} />
        <Route path="exams" element={<ExamManagement />} />
        <Route path="exams/results" element={<ResultWorkflowPage />} />
        <Route path="exams/grading" element={<GradingScalesPage />} />
        <Route path="exams/eligibility" element={<EligibilityRulesPage />} />
        <Route path="exams/seats" element={<SeatAllocationPage />} />
        <Route path="exams/analytics" element={<ExamAnalyticsPage />} />
        <Route path="exams/proctor" element={<ProctorConsolePage />} />
        <Route path="exams/reeval" element={<ReevalQueuePage />} />
        <Route path="library" element={<LibraryManagement />} />
        <Route path="transport" element={<TransportManagement />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="notifications" element={<NotificationsInboxPage />} />
        <Route path="notifications/send" element={<NotificationComposerPage />} />
        <Route path="messages" element={<AdminMessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
