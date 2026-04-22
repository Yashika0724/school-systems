import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentData } from './useStudentData';

const BUCKET = 'homework-files';

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submission_text: string | null;
  attachment_url: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    roll_number: string | null;
    profile?: { full_name: string | null; avatar_url: string | null };
  };
}

export function useMyHomeworkSubmission(homeworkId: string | undefined) {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['my-homework-submission', homeworkId, studentData?.id],
    queryFn: async () => {
      if (!homeworkId || !studentData?.id) return null;
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('homework_id', homeworkId)
        .eq('student_id', studentData.id)
        .maybeSingle();
      if (error) throw error;
      return data as HomeworkSubmission | null;
    },
    enabled: !!homeworkId && !!studentData?.id,
  });
}

export function useMyHomeworkSubmissionsByIds(homeworkIds: string[] | undefined) {
  const { data: studentData } = useStudentData();

  return useQuery({
    queryKey: ['my-homework-submissions', studentData?.id, (homeworkIds || []).slice().sort().join(',')],
    queryFn: async () => {
      if (!studentData?.id || !homeworkIds || homeworkIds.length === 0) return [];
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', studentData.id)
        .in('homework_id', homeworkIds);
      if (error) throw error;
      return (data || []) as HomeworkSubmission[];
    },
    enabled: !!studentData?.id && !!homeworkIds && homeworkIds.length > 0,
  });
}

export function useSubmitHomework() {
  const queryClient = useQueryClient();
  const { data: studentData } = useStudentData();

  return useMutation({
    mutationFn: async (payload: {
      homework_id: string;
      submission_text?: string | null;
      file?: File | null;
      existingSubmissionId?: string | null;
      existingAttachmentUrl?: string | null;
    }) => {
      if (!studentData?.id) throw new Error('Student record not found');

      let attachmentUrl: string | null = payload.existingAttachmentUrl ?? null;

      if (payload.file) {
        const safeName = payload.file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const path = `student/${studentData.id}/${payload.homework_id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase
          .storage
          .from(BUCKET)
          .upload(path, payload.file, { upsert: false, contentType: payload.file.type });
        if (uploadError) throw uploadError;
        attachmentUrl = path;
      }

      const row = {
        homework_id: payload.homework_id,
        student_id: studentData.id,
        submission_text: payload.submission_text?.trim() || null,
        attachment_url: attachmentUrl,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };

      if (payload.existingSubmissionId) {
        const { data, error } = await supabase
          .from('homework_submissions')
          .update(row)
          .eq('id', payload.existingSubmissionId)
          .select()
          .single();
        if (error) throw error;
        return data as HomeworkSubmission;
      }

      const { data, error } = await supabase
        .from('homework_submissions')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as HomeworkSubmission;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-homework-submission', variables.homework_id] });
      queryClient.invalidateQueries({ queryKey: ['my-homework-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['homework-submissions', variables.homework_id] });
      queryClient.invalidateQueries({ queryKey: ['parent-homework'] });
    },
  });
}

export function useHomeworkSubmissions(homeworkId: string | undefined) {
  return useQuery({
    queryKey: ['homework-submissions', homeworkId],
    queryFn: async () => {
      if (!homeworkId) return [];
      const { data, error } = await supabase
        .from('homework_submissions')
        .select(`
          *,
          student:students(
            id,
            roll_number,
            profile:profiles!students_user_id_fkey(full_name, avatar_url)
          )
        `)
        .eq('homework_id', homeworkId)
        .order('submitted_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        student: row.student
          ? {
              ...row.student,
              profile: Array.isArray(row.student.profile) ? row.student.profile[0] : row.student.profile,
            }
          : undefined,
      })) as HomeworkSubmission[];
    },
    enabled: !!homeworkId,
  });
}

export interface ClassRosterStudent {
  id: string;
  roll_number: string | null;
  user_id: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

export function useClassRoster(classId: string | undefined) {
  return useQuery({
    queryKey: ['class-roster', classId],
    queryFn: async () => {
      if (!classId) return [];
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          roll_number,
          user_id,
          profile:profiles!students_user_id_fkey(full_name, avatar_url)
        `)
        .eq('class_id', classId);
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        profile: Array.isArray(s.profile) ? s.profile[0] : s.profile,
      })) as ClassRosterStudent[];
    },
    enabled: !!classId,
  });
}

export function useGradeHomeworkSubmission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      submission_id: string;
      homework_id: string;
      grade: string;
      feedback?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .update({
          grade: payload.grade,
          feedback: payload.feedback?.trim() || null,
          status: 'graded',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        })
        .eq('id', payload.submission_id)
        .select()
        .single();
      if (error) throw error;
      return data as HomeworkSubmission;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions', variables.homework_id] });
      queryClient.invalidateQueries({ queryKey: ['my-homework-submission'] });
      queryClient.invalidateQueries({ queryKey: ['my-homework-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['parent-homework'] });
    },
  });
}

export function useUpdateHomework() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      title?: string;
      description?: string | null;
      due_date?: string;
      attachment_url?: string | null;
    }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from('homework')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      queryClient.invalidateQueries({ queryKey: ['student-homework'] });
      queryClient.invalidateQueries({ queryKey: ['parent-homework'] });
    },
  });
}

export function useUploadTeacherHomeworkFile() {
  return useMutation({
    mutationFn: async (payload: { homework_id: string; file: File }) => {
      const safeName = payload.file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const path = `teacher/${payload.homework_id}/${Date.now()}_${safeName}`;
      const { error } = await supabase
        .storage
        .from(BUCKET)
        .upload(path, payload.file, { upsert: false, contentType: payload.file.type });
      if (error) throw error;
      return path;
    },
  });
}

export function getHomeworkFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Already a full URL (legacy rows)
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export async function getHomeworkFileSignedUrl(path: string | null | undefined, expiresIn = 300): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
