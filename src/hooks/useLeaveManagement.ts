import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveRequest {
  id: string;
  user_id: string;
  user_type: 'teacher' | 'student';
  leave_type: 'sick' | 'personal' | 'family' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  student?: {
    class?: {
      name: string;
      section: string;
    };
  };
}

// Get current user's leave requests
export function useMyLeaveRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-leave-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user?.id,
  });
}

// Get pending leave requests for class teacher to review
export function useClassLeaveRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['class-leave-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get teacher record
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!teacher) return [];

      // Get classes where teacher is class teacher
      const { data: assignments } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacher.id)
        .eq('is_class_teacher', true);

      if (!assignments || assignments.length === 0) return [];

      const classIds = assignments.map(a => a.class_id);

      // Get students in these classes
      const { data: students } = await supabase
        .from('students')
        .select('user_id, class:classes(name, section)')
        .in('class_id', classIds);

      if (!students || students.length === 0) return [];

      const studentUserIds = students.map(s => s.user_id);

      // Get leave requests for these students
      const { data: requests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_type', 'student')
        .in('user_id', studentUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', studentUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const studentMap = new Map(students?.map(s => [s.user_id, s]) || []);

      return (requests || []).map(req => ({
        ...req,
        profile: profileMap.get(req.user_id),
        student: studentMap.get(req.user_id),
      })) as LeaveRequest[];
    },
    enabled: !!user?.id,
  });
}

// Get all leave requests (for admin)
export function useAllLeaveRequests() {
  return useQuery({
    queryKey: ['all-leave-requests'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) return [];

      // Get profiles for all users
      const userIds = [...new Set(requests.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return requests.map(req => ({
        ...req,
        profile: profileMap.get(req.user_id),
      })) as LeaveRequest[];
    },
  });
}

// Create leave request
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      leave_type: 'sick' | 'personal' | 'family' | 'other';
      start_date: string;
      end_date: string;
      reason: string;
      user_type: 'teacher' | 'student';
      user_id?: string; // For parents creating on behalf of child
    }) => {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: data.user_id || user?.id,
          user_type: data.user_type,
          leave_type: data.leave_type,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['class-leave-requests'] });
      toast.success('Leave request submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit leave request: ' + error.message);
    },
  });
}

// Update leave request status (approve/reject)
export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status: 'approved' | 'rejected';
      review_notes?: string;
    }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: data.status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: data.review_notes,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      toast.success(`Leave request ${variables.status}`);
    },
    onError: (error) => {
      toast.error('Failed to update leave request: ' + error.message);
    },
  });
}
