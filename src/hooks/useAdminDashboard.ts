import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface AdminDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  attendanceToday: number;
  feeCollectionRate: number;
  totalFeeCollected: number;
  totalFeePending: number;
  totalFeeExpected: number;
  overdueInvoices: number;
}

// Get comprehensive admin stats
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<AdminDashboardStats> => {
      // Fetch basic counts
      const [studentsResult, teachersResult, parentsResult, classesResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('parents').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate today's attendance rate
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today);

      const totalAttendance = todayAttendance?.length || 0;
      const presentCount = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const attendanceToday = totalAttendance > 0 
        ? Math.round((presentCount / totalAttendance) * 100) 
        : 0;

      // Calculate fee collection stats
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('total_amount, paid_amount, status, due_date');

      let totalFeeExpected = 0;
      let totalFeeCollected = 0;
      let overdueInvoices = 0;

      invoices?.forEach(inv => {
        totalFeeExpected += inv.total_amount;
        totalFeeCollected += inv.paid_amount || 0;
        
        if (inv.status !== 'paid' && new Date(inv.due_date) < new Date()) {
          overdueInvoices++;
        }
      });

      const totalFeePending = totalFeeExpected - totalFeeCollected;
      const feeCollectionRate = totalFeeExpected > 0 
        ? Math.round((totalFeeCollected / totalFeeExpected) * 100) 
        : 0;

      return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalParents: parentsResult.count || 0,
        totalClasses: classesResult.count || 0,
        attendanceToday,
        feeCollectionRate,
        totalFeeCollected,
        totalFeePending,
        totalFeeExpected,
        overdueInvoices,
      };
    },
  });
}

// Get recent activities
export function useRecentActivities() {
  return useQuery({
    queryKey: ['admin-recent-activities'],
    queryFn: async () => {
      const activities: Array<{ type: string; message: string; time: string }> = [];

      // Get recent student enrollments
      const { data: recentStudents } = await supabase
        .from('students')
        .select('created_at, class:classes(name, section)')
        .order('created_at', { ascending: false })
        .limit(2);

      recentStudents?.forEach(student => {
        const classData = Array.isArray(student.class) ? student.class[0] : student.class;
        const className = classData ? `${classData.name}-${classData.section}` : 'a class';
        activities.push({
          type: 'enrollment',
          message: `New student enrolled in Class ${className}`,
          time: formatTimeAgo(new Date(student.created_at)),
        });
      });

      // Get recent fee payments
      const { data: recentPayments } = await supabase
        .from('fee_payments')
        .select('created_at, amount')
        .order('created_at', { ascending: false })
        .limit(2);

      if (recentPayments && recentPayments.length > 0) {
        const totalAmount = recentPayments.reduce((sum, p) => sum + p.amount, 0);
        activities.push({
          type: 'fee',
          message: `Fee payments of ₹${formatCurrency(totalAmount)} received`,
          time: formatTimeAgo(new Date(recentPayments[0].created_at)),
        });
      }

      // Get recent announcements
      const { data: recentAnnouncements } = await supabase
        .from('announcements')
        .select('created_at, title')
        .order('created_at', { ascending: false })
        .limit(1);

      recentAnnouncements?.forEach(ann => {
        activities.push({
          type: 'announcement',
          message: `Announcement published: ${ann.title}`,
          time: formatTimeAgo(new Date(ann.created_at)),
        });
      });

      return activities.slice(0, 4);
    },
  });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

// Get upcoming events from announcements
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['admin-upcoming-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, start_date, announcement_type')
        .eq('announcement_type', 'event')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3);

      if (error) return [];

      return (data || []).map(event => ({
        id: event.id,
        name: event.title,
        date: event.start_date,
      }));
    },
  });
}

// Combined hook for admin dashboard
export function useAdminDashboardData() {
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivities();
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents();

  const isLoading = profileLoading || statsLoading || activitiesLoading || eventsLoading;

  return {
    admin: {
      name: profile?.full_name || 'Admin',
      email: profile?.email || '',
      avatar: profile?.avatar_url,
    },
    stats: stats || {
      totalStudents: 0,
      totalTeachers: 0,
      totalParents: 0,
      totalClasses: 0,
      attendanceToday: 0,
      feeCollectionRate: 0,
      totalFeeCollected: 0,
      totalFeePending: 0,
      totalFeeExpected: 0,
      overdueInvoices: 0,
    },
    recentActivities: activities || [],
    upcomingEvents: events || [],
    isLoading,
  };
}
