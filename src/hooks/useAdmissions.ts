import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'interview_scheduled'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'enrolled'
  | 'withdrawn';

export interface AdmissionsSettings {
  id: string;
  is_open: boolean;
  academic_year: string;
  application_fee: number;
  instructions: string | null;
  contact_email: string | null;
  required_documents: string[];
  updated_at: string;
}

export interface AdmissionApplication {
  id: string;
  application_number: string;
  status: AdmissionStatus;
  student_first_name: string;
  student_last_name: string;
  student_date_of_birth: string;
  student_gender: string | null;
  student_blood_group: string | null;
  student_nationality: string | null;
  previous_school: string | null;
  previous_class: string | null;
  previous_percentage: number | null;
  previous_board: string | null;
  desired_class_id: string | null;
  desired_academic_year: string | null;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_relationship: string;
  parent_occupation: string | null;
  secondary_parent_name: string | null;
  secondary_parent_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  interview_at: string | null;
  interview_notes: string | null;
  converted_student_id: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitApplicationInput {
  student_first_name: string;
  student_last_name: string;
  student_date_of_birth: string;
  student_gender?: string;
  student_blood_group?: string;
  student_nationality?: string;
  previous_school?: string;
  previous_class?: string;
  previous_percentage?: number | null;
  previous_board?: string;
  desired_class_id?: string | null;
  desired_academic_year?: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  parent_relationship?: string;
  parent_occupation?: string;
  secondary_parent_name?: string;
  secondary_parent_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
}

// ==== Public (no auth) ====

export function useAdmissionsSettings() {
  return useQuery({
    queryKey: ['admissions-settings'],
    queryFn: async (): Promise<AdmissionsSettings> => {
      const { data, error } = await supabase
        .from('admissions_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AdmissionsSettings) ?? {
        id: '',
        is_open: false,
        academic_year: '',
        application_fee: 0,
        instructions: null,
        contact_email: null,
        required_documents: [],
        updated_at: new Date().toISOString(),
      };
    },
  });
}

export function usePublicClasses() {
  return useQuery({
    queryKey: ['public-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: async (
      input: SubmitApplicationInput,
    ): Promise<{ application_number: string }> => {
      const { data, error } = await supabase
        .from('admission_applications')
        .insert({ ...input, status: 'submitted' })
        .select('application_number')
        .single();
      if (error) throw error;
      return data as { application_number: string };
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit application'),
  });
}

export interface PublicStatusResult {
  application_number: string;
  status: AdmissionStatus;
  student_first_name: string;
  student_last_name: string;
  desired_academic_year: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  interview_at: string | null;
  review_notes: string | null;
}

export function useLookupStatus() {
  return useMutation({
    mutationFn: async (input: {
      applicationNumber: string;
      email: string;
    }): Promise<PublicStatusResult | null> => {
      const { data, error } = await supabase.rpc('get_admission_status', {
        _application_number: input.applicationNumber.trim(),
        _email: input.email.trim(),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as PublicStatusResult) ?? null;
    },
  });
}

// ==== Admin ====

export function useAdminApplications(filter?: AdmissionStatus | 'all') {
  return useQuery({
    queryKey: ['admin-admissions', filter ?? 'all'],
    queryFn: async (): Promise<AdmissionApplication[]> => {
      let q = supabase
        .from('admission_applications')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (filter && filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdmissionApplication[];
    },
  });
}

export interface UpdateApplicationInput {
  id: string;
  status?: AdmissionStatus;
  review_notes?: string | null;
  interview_at?: string | null;
  interview_notes?: string | null;
}

export function useUpdateApplication() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateApplicationInput) => {
      const { id, ...rest } = input;
      const payload: Record<string, unknown> = { ...rest };
      if (input.status && input.status !== 'submitted') {
        payload.reviewed_by = user?.id ?? null;
        payload.reviewed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('admission_applications')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Application updated');
      qc.invalidateQueries({ queryKey: ['admin-admissions'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Update failed'),
  });
}

export function useUpdateAdmissionsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<Omit<AdmissionsSettings, 'id' | 'updated_at'>> & { id?: string },
    ) => {
      const payload: Record<string, unknown> = {
        ...input,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      };
      delete payload.id;
      if (input.id) {
        const { error } = await supabase
          .from('admissions_settings')
          .update(payload)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('admissions_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['admissions-settings'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Save failed'),
  });
}

export interface EnrollResult {
  success: boolean;
  studentId: string;
  studentUserId: string;
  studentCredentials: { email: string; password: string };
  parentCredentials: { email: string; password: string } | null;
}

export function useEnrollApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      classId: string;
      rollNumber?: string;
      admissionNumber?: string;
      createParent?: boolean;
      studentEmail?: string;
      studentPassword?: string;
      parentPassword?: string;
    }): Promise<EnrollResult> => {
      const { data, error } = await supabase.functions.invoke('enroll-applicant', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as EnrollResult;
    },
    onSuccess: () => {
      toast.success('Applicant enrolled successfully');
      qc.invalidateQueries({ queryKey: ['admin-admissions'] });
      qc.invalidateQueries({ queryKey: ['all-students'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Enrollment failed'),
  });
}
