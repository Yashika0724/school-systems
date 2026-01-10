import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherData, useTeacherAssignments } from './useTeacherData';
import { useUserProfile } from './useUserProfile';

export interface TeacherClassData {
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
  studentCount: number;
  isClassTeacher: boolean;
}

export interface TodayPeriod {
  period: number;
  class: string;
  subject: string;
  time: string;
  room: string | null;
}

// Get student count for each class
async function getClassStudentCounts(classIds: string[]): Promise<Map<string, number>> {
  if (classIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('students')
    .select('class_id')
    .in('class_id', classIds);

  if (error) return new Map();

  const counts = new Map<string, number>();
  data?.forEach(student => {
    if (student.class_id) {
      counts.set(student.class_id, (counts.get(student.class_id) || 0) + 1);
    }
  });

  return counts;
}

// Get teacher's assigned classes with student counts
export function useTeacherClassesWithCounts(teacherId: string | undefined) {
  const { data: assignments } = useTeacherAssignments(teacherId);

  return useQuery({
    queryKey: ['teacher-classes-counts', teacherId],
    queryFn: async (): Promise<TeacherClassData[]> => {
      if (!assignments || assignments.length === 0) return [];

      const classIds = [...new Set(assignments.map(a => a.class_id))];
      const studentCounts = await getClassStudentCounts(classIds);

      return assignments.map(assignment => ({
        classId: assignment.class_id,
        className: assignment.class?.name || '',
        section: assignment.class?.section || '',
        subjectId: assignment.subject_id,
        subjectName: assignment.subject?.name || '',
        studentCount: studentCounts.get(assignment.class_id) || 0,
        isClassTeacher: assignment.is_class_teacher || false,
      }));
    },
    enabled: !!teacherId && !!assignments,
  });
}

// Get teacher's today schedule
export function useTeacherTodaySchedule(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-today-schedule', teacherId],
    queryFn: async (): Promise<TodayPeriod[]> => {
      if (!teacherId) return [];

      const today = new Date().getDay();

      const { data, error } = await supabase
        .from('timetable_slots')
        .select(`
          slot_number,
          start_time,
          end_time,
          room,
          class:classes(name, section),
          subject:subjects(name)
        `)
        .eq('teacher_id', teacherId)
        .eq('day_of_week', today)
        .order('slot_number');

      if (error) return [];

      return (data || []).map(slot => {
        const classData = Array.isArray(slot.class) ? slot.class[0] : slot.class;
        const subjectData = Array.isArray(slot.subject) ? slot.subject[0] : slot.subject;
        
        return {
          period: slot.slot_number,
          class: classData ? `${classData.name}-${classData.section}` : '',
          subject: subjectData?.name || '',
          time: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
          room: slot.room,
        };
      });
    },
    enabled: !!teacherId,
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// Get pending tasks for teacher
export function useTeacherPendingTasks(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['teacher-pending-tasks', teacherId],
    queryFn: async () => {
      if (!teacherId) return { attendanceToMark: 0, homeworkToReview: 0, leaveRequests: 0 };

      // Get classes taught by teacher
      const { data: assignments } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacherId);

      if (!assignments || assignments.length === 0) {
        return { attendanceToMark: 0, homeworkToReview: 0, leaveRequests: 0 };
      }

      const classIds = assignments.map(a => a.class_id);
      const today = new Date().toISOString().split('T')[0];

      // Check how many classes need attendance marked today
      const { data: attendanceMarked } = await supabase
        .from('attendance')
        .select('class_id')
        .in('class_id', classIds)
        .eq('date', today);

      const markedClassIds = new Set(attendanceMarked?.map(a => a.class_id) || []);
      const attendanceToMark = classIds.filter(id => !markedClassIds.has(id)).length;

      // Count homework submissions to review
      const { data: homework } = await supabase
        .from('homework')
        .select('id')
        .eq('assigned_by', teacherId);

      let homeworkToReview = 0;
      if (homework && homework.length > 0) {
        const homeworkIds = homework.map(h => h.id);
        const { count } = await supabase
          .from('homework_submissions')
          .select('id', { count: 'exact', head: true })
          .in('homework_id', homeworkIds)
          .eq('status', 'submitted');
        
        homeworkToReview = count || 0;
      }

      return {
        attendanceToMark,
        homeworkToReview,
        leaveRequests: 0, // Would need leave_requests table
      };
    },
    enabled: !!teacherId,
  });
}

// Get recent students (students from teacher's classes with recent activity)
export function useRecentStudentActivity(teacherId: string | undefined) {
  return useQuery({
    queryKey: ['recent-student-activity', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      // Get classes taught by teacher
      const { data: assignments } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacherId);

      if (!assignments || assignments.length === 0) return [];

      const classIds = assignments.map(a => a.class_id);

      // Get students with recent marks
      const { data: recentMarks } = await supabase
        .from('marks')
        .select(`
          student_id,
          marks_obtained,
          max_marks,
          student:students(
            id,
            class:classes(name, section),
            user_id
          )
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentMarks || recentMarks.length === 0) return [];

      // Get unique students
      const uniqueStudents = new Map();
      recentMarks.forEach(mark => {
        if (!uniqueStudents.has(mark.student_id)) {
          const student = Array.isArray(mark.student) ? mark.student[0] : mark.student;
          const classData = student?.class;
          const classInfo = Array.isArray(classData) ? classData[0] : classData;
          
          const percentage = (mark.marks_obtained / mark.max_marks) * 100;
          let performance = 'Average';
          if (percentage >= 80) performance = 'Excellent';
          else if (percentage >= 60) performance = 'Good';

          uniqueStudents.set(mark.student_id, {
            studentId: mark.student_id,
            userId: student?.user_id,
            class: classInfo ? `${classInfo.name}-${classInfo.section}` : '',
            performance,
          });
        }
      });

      // Get profiles for these students
      const userIds = [...uniqueStudents.values()].map(s => s.userId).filter(Boolean);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return [...uniqueStudents.values()].slice(0, 5).map(student => ({
        name: profileMap.get(student.userId)?.full_name || 'Unknown',
        avatar: profileMap.get(student.userId)?.avatar_url,
        class: student.class,
        performance: student.performance,
      }));
    },
    enabled: !!teacherId,
  });
}

// Combined hook for teacher dashboard
export function useTeacherDashboardData() {
  const { data: teacherData, isLoading: teacherLoading } = useTeacherData();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: classes, isLoading: classesLoading } = useTeacherClassesWithCounts(teacherData?.id);
  const { data: todaySchedule, isLoading: scheduleLoading } = useTeacherTodaySchedule(teacherData?.id);
  const { data: pendingTasks, isLoading: tasksLoading } = useTeacherPendingTasks(teacherData?.id);
  const { data: recentStudents, isLoading: studentsLoading } = useRecentStudentActivity(teacherData?.id);

  const isLoading = teacherLoading || profileLoading || classesLoading || scheduleLoading || tasksLoading || studentsLoading;

  return {
    teacher: teacherData ? {
      id: teacherData.id,
      name: profile?.full_name || 'Teacher',
      email: profile?.email || '',
      avatar: profile?.avatar_url,
      designation: teacherData.designation || 'Teacher',
      employeeId: teacherData.employee_id,
    } : null,
    assignedClasses: classes || [],
    todaySchedule: todaySchedule || [],
    pendingTasks: pendingTasks || { attendanceToMark: 0, homeworkToReview: 0, leaveRequests: 0 },
    recentStudents: recentStudents || [],
    isLoading,
  };
}
