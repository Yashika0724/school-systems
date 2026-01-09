import { useQuery } from '@tanstack/react-query';
import { FileText, TrendingUp, Award, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Mark {
  id: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  subject: { name: string; code: string | null };
  exam_type: { name: string; weightage: number };
}

interface SubjectSummary {
  subject: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  grade: string;
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

function getGradeColor(grade: string) {
  if (grade === 'A+' || grade === 'A') return 'bg-green-100 text-green-700 border-green-300';
  if (grade === 'B+' || grade === 'B') return 'bg-blue-100 text-blue-700 border-blue-300';
  if (grade === 'C') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  if (grade === 'D') return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-red-100 text-red-700 border-red-300';
}

export function StudentMarksPage() {
  const { user } = useAuth();

  const { data: studentData } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const { data: marks, isLoading } = useQuery({
    queryKey: ['student-marks', studentData?.id],
    queryFn: async (): Promise<Mark[]> => {
      if (!studentData) return [];

      const { data, error } = await supabase
        .from('marks')
        .select(`
          id,
          marks_obtained,
          max_marks,
          grade,
          subject:subjects(name, code),
          exam_type:exam_types(name, weightage)
        `)
        .eq('student_id', studentData.id);

      if (error) {
        console.error('Error fetching marks:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
        exam_type: Array.isArray(item.exam_type) ? item.exam_type[0] : item.exam_type,
      })) as Mark[];
    },
    enabled: !!studentData,
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('weightage');
      if (error) return [];
      return data;
    },
  });

  // Calculate subject summaries
  const subjectSummaries: SubjectSummary[] = marks ? 
    Object.values(
      marks.reduce((acc, mark) => {
        const subjectName = mark.subject?.name || 'Unknown';
        if (!acc[subjectName]) {
          acc[subjectName] = { subject: subjectName, totalMarks: 0, maxMarks: 0 };
        }
        acc[subjectName].totalMarks += mark.marks_obtained;
        acc[subjectName].maxMarks += mark.max_marks;
        return acc;
      }, {} as Record<string, { subject: string; totalMarks: number; maxMarks: number }>)
    ).map(item => ({
      ...item,
      percentage: item.maxMarks > 0 ? Math.round((item.totalMarks / item.maxMarks) * 100) : 0,
      grade: calculateGrade(item.maxMarks > 0 ? (item.totalMarks / item.maxMarks) * 100 : 0),
    })) : [];

  // Calculate overall stats
  const overallTotal = subjectSummaries.reduce((sum, s) => sum + s.totalMarks, 0);
  const overallMax = subjectSummaries.reduce((sum, s) => sum + s.maxMarks, 0);
  const overallPercentage = overallMax > 0 ? Math.round((overallTotal / overallMax) * 100) : 0;
  const overallGrade = calculateGrade(overallPercentage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Marks & Results</h1>
        <p className="text-muted-foreground">View your academic performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6 text-center">
            <Award className="h-12 w-12 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold text-primary">{overallGrade}</p>
            <p className="text-sm text-muted-foreground">Overall Grade</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-600" />
            <p className="text-4xl font-bold">{overallPercentage}%</p>
            <p className="text-sm text-muted-foreground">Overall Percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 text-blue-600" />
            <p className="text-4xl font-bold">{overallTotal}/{overallMax}</p>
            <p className="text-sm text-muted-foreground">Total Marks</p>
          </CardContent>
        </Card>
      </div>

      {marks && marks.length > 0 ? (
        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subjects">By Subject</TabsTrigger>
            <TabsTrigger value="exams">By Exam</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="space-y-4">
            {subjectSummaries.map((subject) => (
              <Card key={subject.subject}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{subject.subject}</h3>
                      <p className="text-sm text-muted-foreground">
                        {subject.totalMarks}/{subject.maxMarks} marks
                      </p>
                    </div>
                    <Badge className={getGradeColor(subject.grade)}>
                      {subject.grade} - {subject.percentage}%
                    </Badge>
                  </div>
                  <Progress value={subject.percentage} className="h-2" />

                  {/* Individual exam marks */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {marks
                      .filter(m => m.subject?.name === subject.subject)
                      .map((mark) => (
                        <div
                          key={mark.id}
                          className="p-2 rounded bg-muted/50 text-center"
                        >
                          <p className="text-xs text-muted-foreground">
                            {mark.exam_type?.name}
                          </p>
                          <p className="font-semibold">
                            {mark.marks_obtained}/{mark.max_marks}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            {examTypes?.map((examType) => {
              const examMarks = marks.filter(m => m.exam_type?.name === examType.name);
              if (examMarks.length === 0) return null;

              const examTotal = examMarks.reduce((sum, m) => sum + m.marks_obtained, 0);
              const examMax = examMarks.reduce((sum, m) => sum + m.max_marks, 0);
              const examPercent = examMax > 0 ? Math.round((examTotal / examMax) * 100) : 0;

              return (
                <Card key={examType.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{examType.name}</span>
                      <Badge variant="outline">
                        {examTotal}/{examMax} ({examPercent}%)
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {examMarks.map((mark) => (
                        <div
                          key={mark.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <span className="font-medium">{mark.subject?.name}</span>
                          <div className="flex items-center gap-3">
                            <span>
                              {mark.marks_obtained}/{mark.max_marks}
                            </span>
                            <Badge className={getGradeColor(mark.grade || '')}>
                              {mark.grade}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Marks Available</h3>
            <p className="text-muted-foreground">
              Your marks will appear here once your teachers upload them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
