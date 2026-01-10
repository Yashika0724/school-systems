import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentData } from './useStudentData';
import { useUserProfile } from './useUserProfile';

// Get student attendance stats
export function useStudentAttendance() {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['student-attendance-stats', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return null;

      const { data, error } = await supabase
        .from('attendance')
        .select('status, date')
        .eq('student_id', studentData.id);

      if (error) throw error;

      const total = data?.length || 0;
      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = data?.filter(a => a.status === 'absent').length || 0;
      const late = data?.filter(a => a.status === 'late').length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0;

      return { present, absent, late, total, percentage };
    },
    enabled: !!studentData?.id,
  });
}

// Get student recent marks
export function useStudentMarks() {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['student-marks', studentData?.id],
    queryFn: async () => {
      if (!studentData?.id) return [];

      const { data, error } = await supabase
        .from('marks')
        .select(`
          *,
          subject:subjects(id, name),
          exam_type:exam_types(id, name)
        `)
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map(mark => ({
        subject: Array.isArray(mark.subject) ? mark.subject[0]?.name : mark.subject?.name,
        marks: mark.marks_obtained,
        total: mark.max_marks,
        grade: mark.grade || calculateGrade(mark.marks_obtained, mark.max_marks),
        examType: Array.isArray(mark.exam_type) ? mark.exam_type[0]?.name : mark.exam_type?.name,
      }));
    },
    enabled: !!studentData?.id,
  });
}

function calculateGrade(marks: number, total: number): string {
  const percentage = (marks / total) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// Get student pending homework
export function useStudentHomework() {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['student-homework', studentData?.class_id],
    queryFn: async () => {
      if (!studentData?.class_id) return [];

      // Get homework for student's class
      const { data: homework, error } = await supabase
        .from('homework')
        .select(`
          *,
          subject:subjects(id, name)
        `)
        .eq('class_id', studentData.class_id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Get student's submissions
      const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('homework_id, status')
        .eq('student_id', studentData.id);

      const submissionMap = new Map(submissions?.map(s => [s.homework_id, s.status]) || []);

      return (homework || []).map(hw => ({
        id: hw.id,
        title: hw.title,
        subject: Array.isArray(hw.subject) ? hw.subject[0]?.name : hw.subject?.name,
        dueDate: hw.due_date,
        description: hw.description,
        status: submissionMap.get(hw.id) || 'pending',
      }));
    },
    enabled: !!studentData?.class_id && !!studentData?.id,
  });
}

// Get student's today schedule
export function useStudentTodaySchedule() {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['student-today-schedule', studentData?.class_id],
    queryFn: async () => {
      if (!studentData?.class_id) return [];

      const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const { data, error } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          subject:subjects(id, name)
        `)
        .eq('class_id', studentData.class_id)
        .eq('day_of_week', today)
        .order('slot_number');

      if (error) throw error;

      return (data || []).map(slot => ({
        period: slot.slot_number,
        subject: Array.isArray(slot.subject) ? slot.subject[0]?.name : slot.subject?.name || 'Free',
        startTime: slot.start_time,
        endTime: slot.end_time,
        room: slot.room,
      }));
    },
    enabled: !!studentData?.class_id,
  });
}

// Get count of upcoming exams (placeholder - would need exam_schedule table)
export function useUpcomingExamsCount() {
  return useQuery({
    queryKey: ['upcoming-exams-count'],
    queryFn: async () => {
      // Placeholder - in a real app, you'd have an exam_schedule table
      return 0;
    },
  });
}

// Combined hook for student dashboard
export function useStudentDashboardData() {
  const { data: studentData, isLoading: studentLoading } = useStudentData();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: attendance, isLoading: attendanceLoading } = useStudentAttendance();
  const { data: marks, isLoading: marksLoading } = useStudentMarks();
  const { data: homework, isLoading: homeworkLoading } = useStudentHomework();
  const { data: todaySchedule, isLoading: scheduleLoading } = useStudentTodaySchedule();

  const isLoading = studentLoading || profileLoading || attendanceLoading || marksLoading || homeworkLoading || scheduleLoading;

  const pendingHomework = homework?.filter(hw => hw.status === 'pending') || [];

  return {
    student: studentData ? {
      id: studentData.id,
      name: profile?.full_name || 'Student',
      email: profile?.email || '',
      avatar: profile?.avatar_url,
      class: studentData.class ? `${studentData.class.name}-${studentData.class.section}` : '',
      rollNumber: studentData.roll_number || '',
      classId: studentData.class_id,
    } : null,
    attendance: attendance || { present: 0, absent: 0, late: 0, total: 0, percentage: 0 },
    recentMarks: marks || [],
    homework: homework || [],
    pendingHomeworkCount: pendingHomework.length,
    todaySchedule: todaySchedule || [],
    upcomingExams: 0,
    isLoading,
  };
}
