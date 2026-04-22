import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type JustificationStatus = 'pending' | 'approved' | 'rejected';
export type JustificationRequestType = 'excuse' | 'correction';

export interface AttendanceJustification {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  reason: string;
  request_type: JustificationRequestType;
  status: JustificationStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Subscribe to realtime changes on the `attendance` table for a given class/date
 * and invalidate relevant React Query caches so all viewers stay in sync.
 */
export function useAttendanceRealtime(
  classId: string | null | undefined,
  date: Date | null | undefined,
) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!classId || !date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const channel = supabase
      .channel(`attendance:${classId}:${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `class_id=eq.${classId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['child-attendance'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, date, queryClient]);
}

/**
 * Subscribe to realtime changes on `attendance_justifications` for live review queues.
 */
export function useJustificationsRealtime(scopeKey: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!scopeKey) return;
    const channel = supabase
      .channel(`justifications:${scopeKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_justifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendance-justifications'] });
          queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['child-attendance'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopeKey, queryClient]);
}

export interface SubmitJustificationInput {
  studentId: string;
  classId: string;
  date: string;
  reason: string;
  requestType?: JustificationRequestType;
}

export function useSubmitJustification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitJustificationInput) => {
      const { error } = await supabase
        .from('attendance_justifications')
        .insert({
          student_id: input.studentId,
          class_id: input.classId,
          date: input.date,
          reason: input.reason,
          request_type: input.requestType ?? 'excuse',
          status: 'pending',
          requested_by: user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Justification submitted for review');
      queryClient.invalidateQueries({ queryKey: ['attendance-justifications'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit justification');
    },
  });
}

export interface ReviewJustificationInput {
  id: string;
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

export function useReviewJustification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReviewJustificationInput) => {
      const { error } = await supabase
        .from('attendance_justifications')
        .update({
          status: input.status,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          review_notes: input.reviewNotes ?? null,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'approved'
          ? 'Approved — attendance marked as excused'
          : 'Request rejected',
      );
      queryClient.invalidateQueries({ queryKey: ['attendance-justifications'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to review justification');
    },
  });
}

/**
 * Fetch justifications for one student (used by student/parent pages to show status).
 */
export function useStudentJustifications(studentId: string | null | undefined) {
  return useQuery({
    queryKey: ['attendance-justifications', 'student', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('attendance_justifications')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttendanceJustification[];
    },
    enabled: !!studentId,
  });
}

/**
 * Fetch justifications for the teacher's class-teacher classes.
 */
export function useTeacherPendingJustifications(classIds: string[] | undefined) {
  return useQuery({
    queryKey: ['attendance-justifications', 'teacher', classIds?.join(',') ?? ''],
    queryFn: async () => {
      if (!classIds || classIds.length === 0) return [];
      const { data, error } = await supabase
        .from('attendance_justifications')
        .select('*')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AttendanceJustification[];
    },
    enabled: !!classIds && classIds.length > 0,
  });
}
