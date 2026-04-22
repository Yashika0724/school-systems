import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Subscribe to realtime inserts/updates on messages involving current user
export function useMessagesRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

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

// Get parents of students in the teacher's classes
export function useAvailableParents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-parents', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!teacher) return [];

      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacher.id);

      const classIds = [...new Set((teacherClasses || []).map(tc => tc.class_id))];
      if (classIds.length === 0) return [];

      const { data: students } = await supabase
        .from('students')
        .select('id, roll_number, class:classes(name, section)')
        .in('class_id', classIds);

      const studentIds = (students || []).map(s => s.id);
      if (studentIds.length === 0) return [];

      const { data: links } = await supabase
        .from('parent_student')
        .select('parent_id, student_id, relationship, parent:parents(user_id)')
        .in('student_id', studentIds);

      const parentUserIds = [...new Set(
        (links || [])
          .map(l => (l.parent as { user_id?: string } | null)?.user_id)
          .filter((v): v is string => !!v),
      )];
      if (parentUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, phone')
        .in('user_id', parentUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const studentMap = new Map((students || []).map(s => [s.id, s]));

      const parentMap = new Map<string, {
        user_id: string;
        full_name: string;
        avatar_url: string | null;
        phone: string | null;
        children: { roll_number: string | null; class: string; relationship: string | null }[];
      }>();

      (links || []).forEach(link => {
        const userId = (link.parent as { user_id?: string } | null)?.user_id;
        if (!userId) return;
        const profile = profileMap.get(userId);
        if (!parentMap.has(userId)) {
          parentMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            phone: profile?.phone || null,
            children: [],
          });
        }
        const student = studentMap.get(link.student_id);
        const cls = student?.class as { name?: string; section?: string } | null;
        parentMap.get(userId)!.children.push({
          roll_number: student?.roll_number ?? null,
          class: cls ? `${cls.name || ''}-${cls.section || ''}` : '',
          relationship: link.relationship ?? null,
        });
      });

      return Array.from(parentMap.values());
    },
    enabled: !!user,
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

// Students in the current teacher's classes (for teacher → student chat)
export function useAvailableStudentsForTeacher() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-students-teacher', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!teacher) return [];

      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', teacher.id);

      const classIds = [...new Set((teacherClasses || []).map(tc => tc.class_id))];
      if (classIds.length === 0) return [];

      const { data: students } = await supabase
        .from('students')
        .select('id, user_id, roll_number, class:classes(name, section)')
        .in('class_id', classIds);

      const userIds = (students || []).map(s => s.user_id).filter(Boolean);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (students || []).map(s => {
        const profile = profileMap.get(s.user_id);
        const cls = s.class as { name?: string; section?: string } | null;
        return {
          user_id: s.user_id,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          roll_number: s.roll_number ?? null,
          class_label: cls ? `${cls.name || ''}-${cls.section || ''}` : '',
        };
      });
    },
    enabled: !!user,
  });
}

// Admins (for teacher → admin chat)
export function useAvailableAdmins() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-admins', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = [...new Set((roles || []).map(r => r.user_id).filter(Boolean))]
        .filter(id => id !== user.id);
      if (adminIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', adminIds);

      return (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Unknown',
        avatar_url: p.avatar_url || null,
      }));
    },
    enabled: !!user,
  });
}

// Teachers who teach the student's class (for student → teacher chat)
export function useAvailableTeachersForStudent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-teachers-student', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: student } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!student?.class_id) return [];

      const { data: teacherClasses } = await supabase
        .from('teacher_classes')
        .select(`
          teacher:teachers(id, user_id, designation),
          subject:subjects(name),
          class:classes(name, section)
        `)
        .eq('class_id', student.class_id);

      if (!teacherClasses) return [];

      const teacherUserIds = [...new Set(
        teacherClasses.map(tc => (tc.teacher as any)?.user_id).filter(Boolean)
      )];
      if (teacherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', teacherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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

// All teachers (for admin → teacher chat)
export function useAvailableTeachersForAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-teachers-admin', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, user_id, designation');

      const teacherUserIds = (teachers || [])
        .map(t => t.user_id)
        .filter((v): v is string => !!v && v !== user.id);
      if (teacherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', teacherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (teachers || [])
        .filter(t => t.user_id && t.user_id !== user.id)
        .map(t => {
          const profile = profileMap.get(t.user_id);
          return {
            user_id: t.user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            designation: t.designation || null,
          };
        });
    },
    enabled: !!user,
  });
}
