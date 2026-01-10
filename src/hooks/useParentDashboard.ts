import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentData, useLinkedChildren } from './useParentData';
import { useUserProfile } from './useUserProfile';

export interface ChildDashboardData {
  id: string;
  studentId: string;
  name: string;
  avatar: string | null;
  class: string;
  rollNumber: string | null;
  attendance: {
    percentage: number;
    present: number;
    total: number;
  };
  recentGrade: string;
  pendingFees: number;
}

// Get attendance stats for a specific student
async function getStudentAttendance(studentId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId);

  if (error) return { percentage: 0, present: 0, total: 0 };

  const total = data?.length || 0;
  const present = data?.filter(a => a.status === 'present').length || 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return { percentage, present, total };
}

// Get recent grade for a student
async function getStudentRecentGrade(studentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('marks')
    .select('marks_obtained, max_marks, grade')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return 'N/A';

  if (data[0].grade) return data[0].grade;

  const percentage = (data[0].marks_obtained / data[0].max_marks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  return 'C';
}

// Get pending fees for a student
async function getStudentPendingFees(studentId: string): Promise<number> {
  const { data, error } = await supabase
    .from('fee_invoices')
    .select('total_amount, paid_amount')
    .eq('student_id', studentId)
    .in('status', ['pending', 'partial']);

  if (error || !data) return 0;

  return data.reduce((sum, inv) => {
    const pending = inv.total_amount - (inv.paid_amount || 0);
    return sum + pending;
  }, 0);
}

// Combined children data with stats
export function useChildrenWithStats(parentId: string | undefined) {
  const { data: linkedChildren } = useLinkedChildren(parentId);

  return useQuery({
    queryKey: ['children-with-stats', parentId],
    queryFn: async (): Promise<ChildDashboardData[]> => {
      if (!linkedChildren || linkedChildren.length === 0) return [];

      const childrenData = await Promise.all(
        linkedChildren.map(async (child) => {
          const [attendance, recentGrade, pendingFees] = await Promise.all([
            getStudentAttendance(child.student_id),
            getStudentRecentGrade(child.student_id),
            getStudentPendingFees(child.student_id),
          ]);

          return {
            id: child.id,
            studentId: child.student_id,
            name: child.student.profile?.full_name || 'Unknown',
            avatar: child.student.profile?.avatar_url || null,
            class: child.student.class 
              ? `${child.student.class.name}-${child.student.class.section}` 
              : 'Not Assigned',
            rollNumber: child.student.roll_number,
            attendance,
            recentGrade,
            pendingFees,
          };
        })
      );

      return childrenData;
    },
    enabled: !!parentId && !!linkedChildren && linkedChildren.length > 0,
  });
}

// Combined hook for parent dashboard
export function useParentDashboardData() {
  const { data: parentData, isLoading: parentLoading } = useParentData();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: children, isLoading: childrenLoading } = useChildrenWithStats(parentData?.id);

  const isLoading = parentLoading || profileLoading || childrenLoading;

  return {
    parent: parentData ? {
      id: parentData.id,
      name: profile?.full_name || 'Parent',
      email: profile?.email || '',
      avatar: profile?.avatar_url,
      occupation: parentData.occupation,
    } : null,
    children: children || [],
    isLoading,
  };
}
