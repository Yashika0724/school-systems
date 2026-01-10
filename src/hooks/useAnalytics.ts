import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface AttendanceStats {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export interface ClassPerformance {
  className: string;
  section: string;
  averageMarks: number;
  studentCount: number;
  attendanceRate: number;
}

export interface MonthlyFeeCollection {
  month: string;
  collected: number;
  pending: number;
  total: number;
}

export interface SubjectPerformance {
  subject: string;
  averageMarks: number;
  highestMarks: number;
  lowestMarks: number;
  passRate: number;
}

// Get attendance stats for the last 30 days
export function useAttendanceAnalytics() {
  return useQuery({
    queryKey: ['attendance-analytics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by date
      const byDate: Record<string, { present: number; absent: number; late: number; total: number }> = {};

      data?.forEach(record => {
        if (!byDate[record.date]) {
          byDate[record.date] = { present: 0, absent: 0, late: 0, total: 0 };
        }
        byDate[record.date].total++;
        if (record.status === 'present') byDate[record.date].present++;
        else if (record.status === 'absent') byDate[record.date].absent++;
        else if (record.status === 'late') byDate[record.date].late++;
      });

      const stats: AttendanceStats[] = Object.entries(byDate).map(([date, counts]) => ({
        date,
        ...counts,
        percentage: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));

      return stats;
    },
  });
}

// Get class-wise performance
export function useClassPerformance() {
  return useQuery({
    queryKey: ['class-performance'],
    queryFn: async () => {
      // Get all classes
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, section');

      if (classError) throw classError;

      // Get marks grouped by class
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select('class_id, marks_obtained, max_marks');

      if (marksError) throw marksError;

      // Get student counts per class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('class_id');

      if (studentsError) throw studentsError;

      // Get attendance by class
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('class_id, status');

      if (attendanceError) throw attendanceError;

      const performance: ClassPerformance[] = classes?.map(cls => {
        const classMarks = marks?.filter(m => m.class_id === cls.id) || [];
        const avgMarks = classMarks.length > 0
          ? classMarks.reduce((sum, m) => sum + (Number(m.marks_obtained) / Number(m.max_marks) * 100), 0) / classMarks.length
          : 0;

        const studentCount = students?.filter(s => s.class_id === cls.id).length || 0;

        const classAttendance = attendance?.filter(a => a.class_id === cls.id) || [];
        const presentCount = classAttendance.filter(a => a.status === 'present').length;
        const attendanceRate = classAttendance.length > 0
          ? Math.round((presentCount / classAttendance.length) * 100)
          : 0;

        return {
          className: cls.name,
          section: cls.section,
          averageMarks: Math.round(avgMarks * 10) / 10,
          studentCount,
          attendanceRate,
        };
      }) || [];

      return performance.sort((a, b) => a.className.localeCompare(b.className));
    },
  });
}

// Get monthly fee collection trends
export function useMonthlyFeeCollection() {
  return useQuery({
    queryKey: ['monthly-fee-collection'],
    queryFn: async () => {
      const months: MonthlyFeeCollection[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        const monthLabel = format(monthStart, 'MMM yyyy');

        const { data: invoices, error } = await supabase
          .from('fee_invoices')
          .select('total_amount, paid_amount')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (error) throw error;

        const collected = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount), 0) || 0;
        const total = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;

        months.push({
          month: monthLabel,
          collected,
          pending: total - collected,
          total,
        });
      }

      return months;
    },
  });
}

// Get subject-wise performance
export function useSubjectPerformance() {
  return useQuery({
    queryKey: ['subject-performance'],
    queryFn: async () => {
      const { data: subjects, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name');

      if (subjectError) throw subjectError;

      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select('subject_id, marks_obtained, max_marks');

      if (marksError) throw marksError;

      const performance: SubjectPerformance[] = subjects?.map(subject => {
        const subjectMarks = marks?.filter(m => m.subject_id === subject.id) || [];
        
        if (subjectMarks.length === 0) {
          return {
            subject: subject.name,
            averageMarks: 0,
            highestMarks: 0,
            lowestMarks: 0,
            passRate: 0,
          };
        }

        const percentages = subjectMarks.map(m => (Number(m.marks_obtained) / Number(m.max_marks)) * 100);
        const avgMarks = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
        const highestMarks = Math.max(...percentages);
        const lowestMarks = Math.min(...percentages);
        const passCount = percentages.filter(p => p >= 33).length;
        const passRate = (passCount / percentages.length) * 100;

        return {
          subject: subject.name,
          averageMarks: Math.round(avgMarks * 10) / 10,
          highestMarks: Math.round(highestMarks * 10) / 10,
          lowestMarks: Math.round(lowestMarks * 10) / 10,
          passRate: Math.round(passRate),
        };
      }) || [];

      return performance.filter(p => p.averageMarks > 0);
    },
  });
}

// Get overall dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Get counts
      const [studentsRes, teachersRes, parentsRes, classesRes, todayAttendanceRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('parents').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
        supabase.from('attendance').select('status').eq('date', today),
      ]);

      const todayAttendance = todayAttendanceRes.data || [];
      const presentToday = todayAttendance.filter(a => a.status === 'present').length;
      const attendancePercentage = todayAttendance.length > 0
        ? Math.round((presentToday / todayAttendance.length) * 100)
        : 0;

      // Get fee stats
      const { data: invoices } = await supabase
        .from('fee_invoices')
        .select('total_amount, paid_amount');

      const totalExpected = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const totalCollected = invoices?.reduce((sum, inv) => sum + Number(inv.paid_amount), 0) || 0;
      const feeCollectedPercentage = totalExpected > 0
        ? Math.round((totalCollected / totalExpected) * 100)
        : 0;

      return {
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalParents: parentsRes.count || 0,
        totalClasses: classesRes.count || 0,
        attendanceToday: attendancePercentage,
        feeCollected: feeCollectedPercentage,
        totalFeeExpected: totalExpected,
        totalFeeCollected: totalCollected,
      };
    },
  });
}
