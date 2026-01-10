import { useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FileText,
  PenTool,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTeacherClassesWithCounts, TeacherClassData } from '@/hooks/useTeacherDashboard';
import { useTeacherData } from '@/hooks/useTeacherData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface ClassStudent {
  id: string;
  roll_number: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async (): Promise<ClassStudent[]> => {
      if (!classId) return [];

      const { data: students, error } = await supabase
        .from('students')
        .select('id, roll_number, user_id')
        .eq('class_id', classId)
        .order('roll_number');

      if (error) throw error;

      const userIds = students?.map(s => s.user_id) || [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (students || []).map(s => ({
        id: s.id,
        roll_number: s.roll_number,
        profile: profileMap.get(s.user_id) || null,
      }));
    },
    enabled: !!classId,
  });
}

export function TeacherClassesPage() {
  const { data: teacherData, isLoading: teacherLoading } = useTeacherData();
  const { data: classes, isLoading: classesLoading } = useTeacherClassesWithCounts(teacherData?.id);
  const [selectedClass, setSelectedClass] = useState<TeacherClassData | null>(null);
  const { data: students, isLoading: studentsLoading } = useClassStudents(selectedClass?.classId || null);

  const isLoading = teacherLoading || classesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Classes Assigned</h2>
          <p className="text-muted-foreground">
            You don't have any classes assigned yet. Please contact the administrator.
          </p>
        </Card>
      </div>
    );
  }

  // Group classes by class name
  const groupedClasses = classes.reduce((acc, cls) => {
    const key = `${cls.className}-${cls.section}`;
    if (!acc[key]) {
      acc[key] = {
        className: cls.className,
        section: cls.section,
        classId: cls.classId,
        studentCount: cls.studentCount,
        isClassTeacher: cls.isClassTeacher,
        subjects: [],
      };
    }
    acc[key].subjects.push(cls.subjectName);
    if (cls.isClassTeacher) {
      acc[key].isClassTeacher = true;
    }
    return acc;
  }, {} as Record<string, {
    className: string;
    section: string;
    classId: string;
    studentCount: number;
    isClassTeacher: boolean;
    subjects: string[];
  }>);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Classes</h1>
          <p className="text-muted-foreground">
            Manage your assigned classes and students
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(groupedClasses).map((cls) => (
          <Card 
            key={cls.classId}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedClass({
              classId: cls.classId,
              className: cls.className,
              section: cls.section,
              subjectId: '',
              subjectName: cls.subjects.join(', '),
              studentCount: cls.studentCount,
              isClassTeacher: cls.isClassTeacher,
            })}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  Class {cls.className}-{cls.section}
                </CardTitle>
                {cls.isClassTeacher && (
                  <Badge variant="default">Class Teacher</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{cls.studentCount} Students</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Subjects: </span>
                  {cls.subjects.join(', ')}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/teacher/attendance?class=${cls.classId}`}>
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      Attendance
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/teacher/marks?class=${cls.classId}`}>
                      <FileText className="h-4 w-4 mr-1" />
                      Marks
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Details Dialog */}
      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Class {selectedClass?.className}-{selectedClass?.section}
              {selectedClass?.isClassTeacher && (
                <Badge variant="default" className="ml-2">Class Teacher</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link to={`/teacher/attendance?class=${selectedClass?.classId}`}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/teacher/marks?class=${selectedClass?.classId}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Enter Marks
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/teacher/homework?class=${selectedClass?.classId}`}>
                  <PenTool className="h-4 w-4 mr-2" />
                  Assign Homework
                </Link>
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Students ({students?.length || 0})</h3>
              {studentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Roll No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.roll_number || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {student.profile?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {student.profile?.full_name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!students || students.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No students in this class
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
