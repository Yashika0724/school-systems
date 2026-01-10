import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  content: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
  receiver_profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// Get all conversations for current user
export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      // Get all messages involving this user
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, {
        other_user_id: string;
        last_message: string;
        last_message_at: string;
        unread_count: number;
      }>();

      messages?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationMap.has(otherId)) {
          conversationMap.set(otherId, {
            other_user_id: otherId,
            last_message: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }

        // Count unread messages
        if (msg.receiver_id === user.id && !msg.read_at) {
          const conv = conversationMap.get(otherId)!;
          conv.unread_count++;
        }
      });

      // Get profiles for all conversation partners
      const otherUserIds = Array.from(conversationMap.keys());
      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return Array.from(conversationMap.values()).map(conv => ({
        ...conv,
        other_user_name: profileMap.get(conv.other_user_id)?.full_name || 'Unknown User',
        other_user_avatar: profileMap.get(conv.other_user_id)?.avatar_url || null,
      }));
    },
    enabled: !!user,
  });
}

// Get messages with a specific user
export function useMessages(otherUserId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', user?.id, otherUserId],
    queryFn: async (): Promise<Message[]> => {
      if (!user || !otherUserId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', [user.id, otherUserId]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(msg => ({
        ...msg,
        sender_profile: profileMap.get(msg.sender_id),
        receiver_profile: profileMap.get(msg.receiver_id),
      }));
    },
    enabled: !!user && !!otherUserId,
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      receiver_id: string;
      subject: string;
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: data.receiver_id,
          subject: data.subject,
          content: data.content,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id, variables.receiver_id] });
      toast.success('Message sent');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });
}

// Mark messages as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// Get teachers for parent's children classes
export function useAvailableTeachers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-teachers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get parent's children
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

      if (classIds.length === 0) return [];

      // Get teachers for these classes
      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select(`
          teacher:teachers(
            id,
            user_id,
            designation
          ),
          subject:subjects(name),
          class:classes(name, section)
        `)
        .in('class_id', classIds);

      if (!teacherClasses) return [];

      // Get teacher profiles
      const teacherUserIds = [...new Set(
        teacherClasses.map(tc => (tc.teacher as any)?.user_id).filter(Boolean)
      )];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', teacherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Build unique teachers list
      const teacherMap = new Map<string, {
        user_id: string;
        full_name: string;
        avatar_url: string | null;
        designation: string | null;
        classes: { class_name: string; section: string; subject: string }[];
      }>();

      teacherClasses.forEach(tc => {
        const teacher = tc.teacher as any;
        if (!teacher?.user_id) return;

        if (!teacherMap.has(teacher.user_id)) {
          const profile = profileMap.get(teacher.user_id);
          teacherMap.set(teacher.user_id, {
            user_id: teacher.user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            designation: teacher.designation,
            classes: [],
          });
        }

        teacherMap.get(teacher.user_id)!.classes.push({
          class_name: (tc.class as any)?.name || '',
          section: (tc.class as any)?.section || '',
          subject: (tc.subject as any)?.name || '',
        });
      });

      return Array.from(teacherMap.values());
    },
    enabled: !!user,
  });
}
