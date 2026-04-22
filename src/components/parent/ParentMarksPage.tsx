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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, TrendingUp, Award, Trophy } from 'lucide-react';
import { useStudentRanks } from '@/hooks/useClassRanks';

interface Mark {
  id: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  remarks: string | null;
  subject: {
    name: string;
    code: string | null;
  };
  exam_type: {
    name: string;
    weightage: number | null;
  };
}

function useChildMarks(studentId: string | null) {
  return useQuery({
    queryKey: ['child-marks', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('marks')
        .select(`
          id,
          marks_obtained,
          max_marks,
          grade,
          remarks,
          subject:subjects(name, code),
          exam_type:exam_types(name, weightage)
        `)
        .eq('student_id', studentId);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
        exam_type: Array.isArray(item.exam_type) ? item.exam_type[0] : item.exam_type,
      })) as Mark[];
    },
    enabled: !!studentId,
  });
}

export function ParentMarksPage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const activeChildId = selectedChildId || children?.[0]?.student_id || null;
  const { data: marks, isLoading: marksLoading } = useChildMarks(activeChildId);
  const { data: ranks } = useStudentRanks(activeChildId);

  const selectedChild = children?.find(c => c.student_id === activeChildId);

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
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Children Linked</h3>
            <p className="text-muted-foreground">Contact admin to link your children to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group marks by exam type
  const marksByExam = marks?.reduce((acc, mark) => {
    const examName = mark.exam_type?.name || 'Unknown';
    if (!acc[examName]) acc[examName] = [];
    acc[examName].push(mark);
    return acc;
  }, {} as Record<string, Mark[]>) || {};

  // Calculate overall stats
  const totalMarks = marks?.reduce((sum, m) => sum + m.marks_obtained, 0) || 0;
  const totalMaxMarks = marks?.reduce((sum, m) => sum + m.max_marks, 0) || 0;
  const overallPercentage = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Progress</h1>
          <p className="text-muted-foreground">View your child's marks and results</p>
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
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-blue-500">
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
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallPercentage}%</p>
                <p className="text-sm text-muted-foreground">Overall Percentage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(marksByExam).length}</p>
                <p className="text-sm text-muted-foreground">Exams Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{marks?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Subject Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {ranks && ranks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Class Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {ranks.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border p-3 bg-gradient-to-br from-amber-50 to-white"
                >
                  <p className="text-sm text-muted-foreground">{r.exam_type_name}</p>
                  <p className="text-2xl font-bold mt-1">
                    Rank {r.rank}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      of {r.class_size}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.percentage}% · {r.total_obtained}/{r.total_max}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marks by Exam */}
      {marksLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(marksByExam).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold">No Marks Available</h3>
            <p className="text-muted-foreground">Marks will appear here once exams are conducted.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(marksByExam).map(([examName, examMarks]) => {
          const examTotal = examMarks.reduce((sum, m) => sum + m.marks_obtained, 0);
          const examMaxTotal = examMarks.reduce((sum, m) => sum + m.max_marks, 0);
          const examPercentage = examMaxTotal > 0 ? ((examTotal / examMaxTotal) * 100).toFixed(1) : '0';

          return (
            <Card key={examName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {examName}
                  </CardTitle>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {examPercentage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examMarks.map((mark) => {
                      const percentage = (mark.marks_obtained / mark.max_marks) * 100;
                      return (
                        <TableRow key={mark.id}>
                          <TableCell className="font-medium">
                            {mark.subject?.name}
                            {mark.subject?.code && (
                              <span className="text-muted-foreground ml-2">({mark.subject.code})</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {mark.marks_obtained} / {mark.max_marks}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={
                              percentage >= 75 ? 'text-green-600' :
                              percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {mark.grade ? (
                              <Badge variant={
                                mark.grade.startsWith('A') ? 'default' :
                                mark.grade.startsWith('B') ? 'secondary' : 'outline'
                              }>
                                {mark.grade}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
