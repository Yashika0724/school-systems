import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, BookOpen, Calendar, Clock } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  subject: {
    name: string;
    code: string | null;
  };
  submission?: {
    status: string;
    grade: string | null;
    submitted_at: string | null;
  };
}

function useChildHomework(classId: string | null, studentId: string | null) {
  return useQuery({
    queryKey: ['child-homework', classId, studentId],
    queryFn: async () => {
      if (!classId) return [];

      const { data: homework, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          due_date,
          assigned_date,
          subject:subjects(name, code)
        `)
        .eq('class_id', classId)
        .order('due_date', { ascending: false });

      if (error) throw error;

      // Get submissions for this student
      if (studentId && homework) {
        const homeworkIds = homework.map(h => h.id);
        const { data: submissions } = await supabase
          .from('homework_submissions')
          .select('homework_id, status, grade, submitted_at')
          .eq('student_id', studentId)
          .in('homework_id', homeworkIds);

        return homework.map(hw => ({
          ...hw,
          subject: Array.isArray(hw.subject) ? hw.subject[0] : hw.subject,
          submission: submissions?.find(s => s.homework_id === hw.id),
        })) as Homework[];
      }

      return (homework || []).map(hw => ({
        ...hw,
        subject: Array.isArray(hw.subject) ? hw.subject[0] : hw.subject,
      })) as Homework[];
    },
    enabled: !!classId,
  });
}

export function ParentHomeworkPage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const activeChildId = selectedChildId || children?.[0]?.student_id || null;
  const selectedChild = children?.find(c => c.student_id === activeChildId);
  
  // Get the class_id for the selected child (need to fetch from students table)
  const { data: studentData } = useQuery({
    queryKey: ['student-class', activeChildId],
    queryFn: async () => {
      if (!activeChildId) return null;
      const { data, error } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', activeChildId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeChildId,
  });

  const { data: homework, isLoading: homeworkLoading } = useChildHomework(
    studentData?.class_id || null,
    activeChildId
  );

  if (parentLoading || childrenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Children Linked</h3>
            <p className="text-muted-foreground">Contact admin to link your children to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Categorize homework
  const pendingHomework = homework?.filter(h => {
    const isPastDue = isPast(new Date(h.due_date)) && !isToday(new Date(h.due_date));
    return !h.submission?.submitted_at && !isPastDue;
  }) || [];

  const submittedHomework = homework?.filter(h => h.submission?.submitted_at) || [];
  
  const overdueHomework = homework?.filter(h => {
    const isPastDue = isPast(new Date(h.due_date)) && !isToday(new Date(h.due_date));
    return !h.submission?.submitted_at && isPastDue;
  }) || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Homework & Assignments</h1>
          <p className="text-muted-foreground">View your child's homework and submission status</p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Child:</span>
              <Select
                value={activeChildId || ''}
                onValueChange={setSelectedChildId}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.student_id} value={child.student_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.student.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {child.student.profile?.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {child.student.profile?.full_name} - Class {child.student.class?.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Child Info */}
      {selectedChild && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-purple-500">
                <AvatarImage src={selectedChild.student.profile?.avatar_url || ''} />
                <AvatarFallback>
                  {selectedChild.student.profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{selectedChild.student.profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Class {selectedChild.student.class?.name} {selectedChild.student.class?.section} • Roll No. {selectedChild.student.roll_number || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingHomework.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submittedHomework.length}</p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueHomework.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Homework List */}
      {homeworkLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : homework?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold">No Homework Assigned</h3>
            <p className="text-muted-foreground">Homework assignments will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueHomework.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Overdue ({overdueHomework.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkList homework={overdueHomework} variant="overdue" />
              </CardContent>
            </Card>
          )}

          {/* Pending */}
          {pendingHomework.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending ({pendingHomework.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkList homework={pendingHomework} variant="pending" />
              </CardContent>
            </Card>
          )}

          {/* Submitted */}
          {submittedHomework.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <BookOpen className="h-5 w-5" />
                  Submitted ({submittedHomework.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomeworkList homework={submittedHomework} variant="submitted" />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function HomeworkList({ homework, variant }: { homework: Homework[]; variant: 'pending' | 'overdue' | 'submitted' }) {
  return (
    <div className="space-y-3">
      {homework.map((hw) => {
        const daysLeft = differenceInDays(new Date(hw.due_date), new Date());
        const dueDateText = isToday(new Date(hw.due_date))
          ? 'Due today'
          : daysLeft > 0
          ? `Due in ${daysLeft} days`
          : `${Math.abs(daysLeft)} days overdue`;

        return (
          <div
            key={hw.id}
            className={`p-4 rounded-lg border ${
              variant === 'overdue' ? 'bg-red-50 border-red-200' :
              variant === 'submitted' ? 'bg-green-50 border-green-200' :
              'bg-muted/50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{hw.subject?.name}</Badge>
                  {hw.submission?.grade && (
                    <Badge variant="default">Grade: {hw.submission.grade}</Badge>
                  )}
                </div>
                <h4 className="font-medium">{hw.title}</h4>
                {hw.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {hw.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Assigned: {format(new Date(hw.assigned_date), 'MMM d, yyyy')}</span>
                  <span className={variant === 'overdue' ? 'text-red-600 font-medium' : ''}>
                    {dueDateText}
                  </span>
                </div>
              </div>
              <Badge
                variant={
                  variant === 'submitted' ? 'default' :
                  variant === 'overdue' ? 'destructive' : 'secondary'
                }
              >
                {variant === 'submitted' ? 'Submitted' :
                 variant === 'overdue' ? 'Overdue' : 'Pending'}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
