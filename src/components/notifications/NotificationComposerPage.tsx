import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, Users, UserCheck, School, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useSendCustomNotification,
  type NotificationPriority,
} from '@/hooks/useNotifications';

type TargetTab = 'class' | 'student' | 'role' | 'all';

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

interface StudentOption {
  id: string;
  roll_number: string | null;
  class_id: string | null;
  full_name: string;
  class_label: string;
}

function useClassesForSender() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['composer-classes', user?.id],
    queryFn: async (): Promise<ClassOption[]> => {
      if (!user) return [];
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const roles = new Set((roleRows ?? []).map((r) => r.role));
      const isAdmin = roles.has('admin');

      if (isAdmin) {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name, section')
          .order('name');
        if (error) throw error;
        return (data ?? []) as ClassOption[];
      }

      const { data: teacher } = await supabase
        .from('teachers').select('id').eq('user_id', user.id).maybeSingle();
      if (!teacher) return [];
      const { data: tc } = await supabase
        .from('teacher_classes')
        .select('class:classes(id, name, section)')
        .eq('teacher_id', teacher.id);
      const seen = new Set<string>();
      const result: ClassOption[] = [];
      (tc ?? []).forEach((row) => {
        const c = row.class as ClassOption | null;
        if (c && !seen.has(c.id)) {
          seen.add(c.id);
          result.push(c);
        }
      });
      return result;
    },
    enabled: !!user,
  });
}

function useStudentsInClasses(classIds: string[]) {
  return useQuery({
    queryKey: ['composer-students', classIds.sort().join(',')],
    queryFn: async (): Promise<StudentOption[]> => {
      if (classIds.length === 0) return [];
      const { data: students, error } = await supabase
        .from('students')
        .select('id, roll_number, class_id, user_id, class:classes(name, section)')
        .in('class_id', classIds);
      if (error) throw error;
      const userIds = (students ?? []).map((s) => s.user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
      return (students ?? []).map((s) => {
        const cls = s.class as { name?: string; section?: string } | null;
        return {
          id: s.id,
          roll_number: s.roll_number ?? null,
          class_id: s.class_id,
          full_name: nameMap.get(s.user_id as string) ?? 'Unnamed student',
          class_label: cls ? `${cls.name}-${cls.section}` : '',
        };
      });
    },
    enabled: classIds.length > 0,
  });
}

function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id);
      return (data ?? []).some((r) => r.role === 'admin');
    },
    enabled: !!user,
  });
}

export function NotificationComposerPage() {
  const [tab, setTab] = useState<TargetTab>('class');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [includeParents, setIncludeParents] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentClassFilter, setStudentClassFilter] = useState<string>('');
  const [targetRole, setTargetRole] = useState<'student' | 'parent' | 'teacher' | 'admin'>('student');

  const { data: classes = [] } = useClassesForSender();
  const { data: isAdmin = false } = useIsAdmin();

  const studentLookupClassIds = useMemo(() => {
    if (studentClassFilter) return [studentClassFilter];
    return classes.map((c) => c.id);
  }, [classes, studentClassFilter]);
  const { data: students = [] } = useStudentsInClasses(studentLookupClassIds);

  const send = useSendCustomNotification();

  const reset = () => {
    setTitle('');
    setMessage('');
    setPriority('normal');
    setIncludeParents(false);
    setSelectedClassIds([]);
    setSelectedStudentIds([]);
    setStudentClassFilter('');
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      if (tab === 'class') {
        if (selectedClassIds.length === 0) return toast.error('Select at least one class');
        await send.mutateAsync({
          title, message, priority,
          target_type: 'class',
          target_class_ids: selectedClassIds,
          include_parents: includeParents,
        });
      } else if (tab === 'student') {
        if (selectedStudentIds.length === 0) return toast.error('Select at least one student');
        await send.mutateAsync({
          title, message, priority,
          target_type: 'student',
          target_student_ids: selectedStudentIds,
          include_parents: includeParents,
        });
      } else if (tab === 'role') {
        await send.mutateAsync({
          title, message, priority,
          target_type: 'role',
          target_role: targetRole,
        });
      } else if (tab === 'all') {
        await send.mutateAsync({
          title, message, priority,
          target_type: 'all',
        });
      }
      reset();
    } catch {
      /* error toast handled inside mutation */
    }
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Send className="h-6 w-6" />
          Send Notification
        </h1>
        <p className="text-sm text-muted-foreground">
          Push a notification to a class, an individual student, or a group.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PTA meeting on Friday"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notif-msg">Message</Label>
            <Textarea
              id="notif-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should the recipients know?"
              rows={4}
              maxLength={1000}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as NotificationPriority)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TargetTab)}>
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="class"><School className="h-4 w-4 mr-1" />Class</TabsTrigger>
              <TabsTrigger value="student"><UserIcon className="h-4 w-4 mr-1" />Student</TabsTrigger>
              <TabsTrigger value="role" disabled={!isAdmin}>
                <UserCheck className="h-4 w-4 mr-1" />Role
              </TabsTrigger>
              <TabsTrigger value="all" disabled={!isAdmin}>
                <Users className="h-4 w-4 mr-1" />All
              </TabsTrigger>
            </TabsList>

            <TabsContent value="class" className="space-y-3 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inc-parents-class"
                  checked={includeParents}
                  onCheckedChange={(v) => setIncludeParents(v === true)}
                />
                <Label htmlFor="inc-parents-class" className="cursor-pointer font-normal">
                  Also notify parents of these students
                </Label>
              </div>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes available.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {classes.map((c) => {
                    const checked = selectedClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleClass(c.id)}
                        />
                        <span className="text-sm">{c.name}-{c.section}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="student" className="space-y-3 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inc-parents-student"
                  checked={includeParents}
                  onCheckedChange={(v) => setIncludeParents(v === true)}
                />
                <Label htmlFor="inc-parents-student" className="cursor-pointer font-normal">
                  Also notify parents of selected students
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Filter by class:</Label>
                <Select
                  value={studentClassFilter || 'all'}
                  onValueChange={(v) => setStudentClassFilter(v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All my classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}-{c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {selectedStudentIds.length} selected
                </span>
              </div>
              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students to show.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
                  {students.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleStudent(s.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.class_label}{s.roll_number ? ` · Roll ${s.roll_number}` : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="role" className="space-y-3 pt-4">
              <div className="space-y-1.5 max-w-xs">
                <Label>Broadcast to role</Label>
                <Select value={targetRole} onValueChange={(v) => setTargetRole(v as typeof targetRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">All students</SelectItem>
                    <SelectItem value="parent">All parents</SelectItem>
                    <SelectItem value="teacher">All teachers</SelectItem>
                    <SelectItem value="admin">All admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This fires one notification to every user with the selected role.
              </p>
            </TabsContent>

            <TabsContent value="all" className="pt-4">
              <p className="text-sm">
                Broadcasts to <strong>every user</strong> across students, parents, teachers, and admins.
                Use sparingly.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset} disabled={send.isPending}>Reset</Button>
        <Button onClick={handleSend} disabled={send.isPending}>
          <Send className="h-4 w-4 mr-2" />
          {send.isPending ? 'Sending…' : 'Send notification'}
        </Button>
      </div>
    </div>
  );
}
