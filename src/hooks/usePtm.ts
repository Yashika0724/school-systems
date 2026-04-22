import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type PtmStatus = 'requested' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type MeetingMode = 'in_person' | 'video' | 'phone';

export interface PtmRequest {
  id: string;
  parent_id: string;
  teacher_id: string;
  student_id: string;
  subject_id: string | null;
  topic: string;
  preferred_date: string | null;
  preferred_slot: string | null;
  meeting_mode: MeetingMode;
  meeting_link: string | null;
  status: PtmStatus;
  parent_notes: string | null;
  teacher_notes: string | null;
  scheduled_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  teacher?: {
    profile?: { full_name: string } | null;
  } | null;
  student?: {
    profile?: { full_name: string } | null;
    class?: { name: string; section: string } | null;
  } | null;
  subject?: { name: string } | null;
}

const db = supabase as unknown as { from: (table: string) => any };

function normalize(r: any): PtmRequest {
  const teacher = Array.isArray(r.teacher) ? r.teacher[0] : r.teacher;
  const student = Array.isArray(r.student) ? r.student[0] : r.student;
  return {
    ...r,
    teacher: teacher
      ? {
          profile: Array.isArray(teacher.profile) ? teacher.profile[0] : teacher.profile,
        }
      : null,
    student: student
      ? {
          profile: Array.isArray(student.profile) ? student.profile[0] : student.profile,
          class: Array.isArray(student.class) ? student.class[0] : student.class,
        }
      : null,
    subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
  };
}

export function usePtmRequests() {
  return useQuery({
    queryKey: ['ptm-requests'],
    queryFn: async (): Promise<PtmRequest[]> => {
      const { data, error } = await db
        .from('ptm_requests')
        .select(`
          *,
          teacher:teachers(
            profile:profiles!teachers_user_id_fkey(full_name)
          ),
          student:students(
            profile:profiles!students_user_id_fkey(full_name),
            class:classes(name, section)
          ),
          subject:subjects(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalize);
    },
  });
}

export function useCreatePtm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      parent_id: string;
      teacher_id: string;
      student_id: string;
      subject_id?: string | null;
      topic: string;
      preferred_date?: string | null;
      preferred_slot?: string | null;
      meeting_mode?: MeetingMode;
      parent_notes?: string | null;
    }) => {
      const { error } = await db.from('ptm_requests').insert({
        ...input,
        meeting_mode: input.meeting_mode ?? 'in_person',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ptm-requests'] });
      toast.success('Meeting requested');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useTeacherRespondPtm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: 'accepted' | 'rejected' | 'completed';
      scheduled_at?: string | null;
      teacher_notes?: string | null;
      meeting_link?: string | null;
    }) => {
      const patch: Record<string, unknown> = {
        status: input.status,
        decided_at: new Date().toISOString(),
      };
      if (input.scheduled_at !== undefined) patch.scheduled_at = input.scheduled_at;
      if (input.teacher_notes !== undefined) patch.teacher_notes = input.teacher_notes;
      if (input.meeting_link !== undefined) patch.meeting_link = input.meeting_link;

      const { error } = await db.from('ptm_requests').update(patch).eq('id', input.id);
      if (error) throw error;

      // Notify parent (and student) via messages
      const { data: row } = await db
        .from('ptm_requests')
        .select('parent_id, student_id, topic, parent:parents(user_id)')
        .eq('id', input.id)
        .single();
      const parent = Array.isArray(row?.parent) ? row.parent[0] : row?.parent;
      if (parent?.user_id && user?.id) {
        await db.from('messages').insert({
          sender_id: user.id,
          receiver_id: parent.user_id,
          subject: `Meeting ${input.status}`,
          content: `Your parent-teacher meeting request about "${row?.topic}" was ${input.status}.${
            input.scheduled_at ? ` Scheduled for ${new Date(input.scheduled_at).toLocaleString()}.` : ''
          }${input.teacher_notes ? ` Note: ${input.teacher_notes}` : ''}`,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ptm-requests'] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useCancelPtm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('ptm_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ptm-requests'] });
      toast.success('Cancelled');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
