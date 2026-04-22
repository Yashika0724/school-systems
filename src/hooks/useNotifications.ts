import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type NotificationType =
  | 'general' | 'attendance' | 'marks' | 'fees' | 'announcement'
  | 'homework' | 'leave' | 'exam' | 'library' | 'transport' | 'custom';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  link: string | null;
  related_table: string | null;
  related_id: string | null;
  sender_id: string | null;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATIONS_TABLE = 'notifications' as const;

export function useNotifications(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async (): Promise<AppNotification[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from(NOTIFICATIONS_TABLE as never)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown as AppNotification[]) ?? [];
    },
    enabled: !!user,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from(NOTIFICATIONS_TABLE as never)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(NOTIFICATIONS_TABLE as never)
        .update({ read_at: new Date().toISOString() } as never)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc(
        'mark_all_notifications_read' as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('All notifications marked as read');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(NOTIFICATIONS_TABLE as never)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export interface SendCustomNotificationInput {
  title: string;
  message: string;
  priority?: NotificationPriority;
  target_type: 'user' | 'student' | 'class' | 'role' | 'all';
  target_user_ids?: string[];
  target_student_ids?: string[];
  target_class_ids?: string[];
  target_role?: 'student' | 'parent' | 'teacher' | 'admin';
  include_parents?: boolean;
}

export function useSendCustomNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendCustomNotificationInput): Promise<number> => {
      const { data, error } = await supabase.rpc(
        'send_custom_notification' as never,
        {
          p_title: input.title,
          p_message: input.message,
          p_priority: input.priority ?? 'normal',
          p_target_type: input.target_type,
          p_target_user_ids: input.target_user_ids ?? null,
          p_target_student_ids: input.target_student_ids ?? null,
          p_target_class_ids: input.target_class_ids ?? null,
          p_target_role: input.target_role ?? null,
          p_include_parents: input.include_parents ?? false,
        } as never,
      );
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success(`Notification sent to ${count} recipient${count === 1 ? '' : 's'}`);
    },
    onError: (e: Error) => toast.error('Failed to send: ' + e.message),
  });
}

// Realtime subscription — fires a toast on arrival + invalidates cache.
export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          qc.invalidateQueries({ queryKey: ['notifications'] });
          qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });

          const toastFn =
            n.priority === 'urgent' || n.priority === 'high'
              ? toast.warning
              : toast.info;
          toastFn(n.title, { description: n.message });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
