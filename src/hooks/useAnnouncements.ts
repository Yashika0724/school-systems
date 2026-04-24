import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: 'general' | 'student' | 'parent' | 'both';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  targets?: Partial<AnnouncementTarget>[];
  creator_profile?: {
    full_name: string;
  };
}

export interface AnnouncementTarget {
  id: string;
  announcement_id: string;
  class_id: string | null;
  class?: {
    id: string;
    name: string;
    section: string;
  };
}

// Get announcements for students (based on their class)
export function useStudentAnnouncements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['student-announcements', user?.id],
    queryFn: async (): Promise<Announcement[]> => {
      if (!user) return [];

      // Get student's class
      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .single();

      if (!student?.class_id) return [];

      // Get announcements that target this class or all classes
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          targets:announcement_targets(id, class_id)
        `)
        .in('announcement_type', ['general', 'student', 'both'])
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }

      // Filter to announcements that target this class or all classes
      return (data || []).filter(announcement => {
        const targets = announcement.targets || [];
        // If no targets, it's for all classes
        if (targets.length === 0) return true;
        // Check if this class is in targets or if there's a null target (all classes)
        return targets.some((t: any) => t.class_id === student.class_id || t.class_id === null);
      }) as unknown as Announcement[];
    },
    enabled: !!user,
  });
}

// Get announcements for parents (based on children's classes)
export function useParentAnnouncements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['parent-announcements', user?.id],
    queryFn: async (): Promise<Announcement[]> => {
      if (!user) return [];

      // Get parent's children classes
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!parent) return [];

      const { data: children } = await supabase
        .from('parent_student')
        .select('student:students(class_id)')
        .eq('parent_id', parent.id);

      const classIds = (children || [])
        .map(c => (c.student as any)?.class_id)
        .filter(Boolean);

      // Get announcements
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          targets:announcement_targets(id, class_id)
        `)
        .in('announcement_type', ['general', 'parent', 'both'])
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }

      // Filter to announcements that target children's classes or all classes
      return (data || []).filter(announcement => {
        const targets = announcement.targets || [];
        if (targets.length === 0) return true;
        return targets.some((t: any) => 
          classIds.includes(t.class_id) || t.class_id === null
        );
      }) as unknown as Announcement[];
    },
    enabled: !!user,
  });
}

// Get all announcements (for admin)
export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['all-announcements'],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          targets:announcement_targets(
            id, 
            class_id,
            class:classes(id, name, section)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all announcements:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        targets: (item.targets || []).map((t: any) => ({
          ...t,
          class: Array.isArray(t.class) ? t.class[0] : t.class,
        })),
      })) as Announcement[];
    },
  });
}

// Get announcements created by current teacher
export function useTeacherAnnouncements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teacher-announcements', user?.id],
    queryFn: async (): Promise<Announcement[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          targets:announcement_targets(
            id, 
            class_id,
            class:classes(id, name, section)
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teacher announcements:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        targets: (item.targets || []).map((t: any) => ({
          ...t,
          class: Array.isArray(t.class) ? t.class[0] : t.class,
        })),
      })) as Announcement[];
    },
    enabled: !!user,
  });
}

// Create announcement
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      content: string;
      announcement_type: string;
      priority: string;
      start_date?: string;
      end_date?: string;
      target_class_ids: string[]; // Empty array = all classes
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { target_class_ids, ...announcementData } = params;

      // Create announcement
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          ...announcementData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create targets
      if (target_class_ids.length > 0) {
        const targets = target_class_ids.map(class_id => ({
          announcement_id: announcement.id,
          class_id,
        }));

        const { error: targetError } = await supabase
          .from('announcement_targets')
          .insert(targets);

        if (targetError) throw targetError;
      }

      // Fan-out notifications now that both the announcement and its targets
      // exist. A DB trigger would fire too early (targets not inserted yet).
      const { error: notifyError } = await supabase.rpc(
        'notify_announcement' as never,
        { p_announcement_id: announcement.id } as never,
      );
      if (notifyError) {
        // Non-fatal — announcement is still saved; log for visibility.
        console.error('notify_announcement failed:', notifyError);
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['parent-announcements'] });
    },
  });
}

// Delete announcement
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
    },
  });
}

// Toggle announcement active status
export function useToggleAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
    },
  });
}
