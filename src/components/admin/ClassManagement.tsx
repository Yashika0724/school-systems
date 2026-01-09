import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, School, Users, BookOpen, Loader2, Trash2 } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  section: string;
  academic_year: string;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

interface Teacher {
  id: string;
  employee_id: string | null;
  designation: string | null;
  profile: {
    full_name: string;
  };
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  is_class_teacher: boolean;
  teacher: Teacher;
  class: Class;
  subject: Subject;
}

function useClasses() {
  return useQuery({
    queryKey: ['admin-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Class[];
    },
  });
}

function useSubjects() {
  return useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Subject[];
    },
  });
}

function useTeachers() {
  return useQuery({
    queryKey: ['admin-teachers-list'],
    queryFn: async () => {
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, employee_id, designation, user_id');
      
      if (teachersError) throw teachersError;

      const userIds = teachers?.map(t => t.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return teachers?.map(t => ({
        ...t,
        profile: profiles?.find(p => p.user_id === t.user_id) || { full_name: 'Unknown' },
      })) as Teacher[];
    },
  });
}

function useTeacherAssignments() {
  return useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_classes')
        .select(`
          id,
          teacher_id,
          class_id,
          subject_id,
          is_class_teacher,
          class:classes(id, name, section, academic_year),
          subject:subjects(id, name, code)
        `);

      if (error) throw error;

      // Get teacher details
      const teacherIds = [...new Set(data?.map(d => d.teacher_id) || [])];
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, employee_id, designation, user_id')
        .in('id', teacherIds);

      if (teachersError) throw teachersError;

      const userIds = teachers?.map(t => t.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return data?.map(item => ({
        ...item,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
        teacher: (() => {
          const teacher = teachers?.find(t => t.id === item.teacher_id);
          const profile = profiles?.find(p => p.user_id === teacher?.user_id);
          return {
            ...teacher,
            profile: profile || { full_name: 'Unknown' },
          };
        })(),
      })) as TeacherAssignment[];
    },
  });
}

export function ClassManagement() {
  const [activeTab, setActiveTab] = useState('classes');
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Class Management</h1>
          <p className="text-muted-foreground">Manage classes, subjects, and teacher assignments</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-6">
          <ClassesTab />
        </TabsContent>

        <TabsContent value="subjects" className="mt-6">
          <SubjectsTab />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClassesTab() {
  const { data: classes, isLoading } = useClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const queryClient = useQueryClient();

  const createClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('classes')
        .insert({ name, section, academic_year: '2024-25' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Class created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      setIsDialogOpen(false);
      setName('');
      setSection('');
    },
    onError: (error) => {
      toast.error('Failed to create class: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Classes</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  placeholder="e.g., 10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input
                  placeholder="e.g., A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createClass.mutate()}
                disabled={!name || !section || createClass.isPending}
              >
                {createClass.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {classes?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No classes created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Academic Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes?.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.section}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cls.academic_year}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function SubjectsTab() {
  const { data: subjects, isLoading } = useSubjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();

  const createSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('subjects')
        .insert({ name, code: code || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subject created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      setIsDialogOpen(false);
      setName('');
      setCode('');
    },
    onError: (error) => {
      toast.error('Failed to create subject: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subjects</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input
                  placeholder="e.g., Mathematics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Code (Optional)</Label>
                <Input
                  placeholder="e.g., MATH"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createSubject.mutate()}
                disabled={!name || createSubject.isPending}
              >
                {createSubject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Subject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {subjects?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No subjects created yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead>Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects?.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>
                    {subject.code ? (
                      <Badge variant="outline">{subject.code}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AssignmentsTab() {
  const { data: assignments, isLoading: assignmentsLoading } = useTeacherAssignments();
  const { data: teachers } = useTeachers();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  
  const queryClient = useQueryClient();

  const createAssignment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('teacher_classes')
        .insert({
          teacher_id: selectedTeacher,
          class_id: selectedClass,
          subject_id: selectedSubject,
          is_class_teacher: isClassTeacher,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Teacher assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      setIsDialogOpen(false);
      setSelectedTeacher('');
      setSelectedClass('');
      setSelectedSubject('');
      setIsClassTeacher(false);
    },
    onError: (error) => {
      toast.error('Failed to assign teacher: ' + error.message);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_classes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assignment removed');
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
    },
    onError: (error) => {
      toast.error('Failed to remove assignment: ' + error.message);
    },
  });

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Teacher Assignments</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Assign Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Teacher to Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isClassTeacher"
                  checked={isClassTeacher}
                  onChange={(e) => setIsClassTeacher(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isClassTeacher">Is Class Teacher</Label>
              </div>
              <Button
                className="w-full"
                onClick={() => createAssignment.mutate()}
                disabled={!selectedTeacher || !selectedClass || !selectedSubject || createAssignment.isPending}
              >
                {createAssignment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign Teacher
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {assignments?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No teacher assignments yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.teacher?.profile?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {assignment.class?.name} - {assignment.class?.section}
                  </TableCell>
                  <TableCell>{assignment.subject?.name}</TableCell>
                  <TableCell>
                    {assignment.is_class_teacher && (
                      <Badge variant="default">Class Teacher</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAssignment.mutate(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
