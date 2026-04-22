import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Loader2, AlertCircle, Send, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, useExamTypes, type TeacherClass } from '@/hooks/useTeacherClasses';
import { usePublicationStatus } from '@/hooks/useResultPublications';

type MarkFlag = 'absent' | 'malpractice' | 're_exam' | '';

interface StudentMark {
  studentId: string;
  marksObtained: string;
  grade: string;
  flag: MarkFlag;
  submissionStatus: 'draft' | 'submitted';
}

function calculateGrade(marks: number, maxMarks: number): string {
  const percentage = (marks / maxMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

const db = supabase as unknown as { from: (table: string) => any };

export function MarksEntryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teacherClasses, isLoading: classesLoading } = useTeacherClasses();
  const { data: examTypes } = useExamTypes();

  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<string>('100');
  const [studentMarks, setStudentMarks] = useState<Map<string, StudentMark>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingMarks, setExistingMarks] = useState(false);

  const { data: students, isLoading: studentsLoading } = useClassStudents(
    selectedClass?.class_id || null,
  );

  const { data: publication } = usePublicationStatus(
    selectedExamType || null,
    selectedClass?.class_id || null,
  );

  const isLocked =
    publication?.status === 'moderated' || publication?.status === 'published';

  const fetchExistingMarks = async (classId: string, subjectId: string, examTypeId: string) => {
    const { data, error } = await db
      .from('marks')
      .select('student_id, marks_obtained, max_marks, grade, flag, submission_status')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('exam_type_id', examTypeId);

    if (error) {
      console.error('Error fetching marks:', error);
      return;
    }

    if (data && data.length > 0) {
      const next = new Map<string, StudentMark>();
      data.forEach((record: any) => {
        next.set(record.student_id, {
          studentId: record.student_id,
          marksObtained: record.marks_obtained?.toString() ?? '',
          grade: record.grade || '',
          flag: (record.flag as MarkFlag) || '',
          submissionStatus: (record.submission_status as 'draft' | 'submitted') || 'draft',
        });
      });
      setStudentMarks(next);
      setMaxMarks(data[0].max_marks.toString());
      setExistingMarks(true);
    } else {
      setStudentMarks(new Map());
      setExistingMarks(false);
    }
  };

  const handleClassChange = (classId: string) => {
    const cls = teacherClasses?.find((c) => c.class_id === classId);
    setSelectedClass(cls || null);
    setStudentMarks(new Map());
    setExistingMarks(false);
    if (cls && selectedExamType) {
      fetchExistingMarks(cls.class_id, cls.subject_id, selectedExamType);
    }
  };

  const handleExamTypeChange = (examTypeId: string) => {
    setSelectedExamType(examTypeId);
    if (selectedClass) {
      fetchExistingMarks(selectedClass.class_id, selectedClass.subject_id, examTypeId);
    }
  };

  const updateStudentMark = (studentId: string, marks: string) => {
    const numMarks = parseFloat(marks) || 0;
    const numMaxMarks = parseFloat(maxMarks) || 100;
    const grade = calculateGrade(numMarks, numMaxMarks);

    setStudentMarks((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        studentId,
        marksObtained: marks,
        grade,
        flag: existing?.flag || '',
        submissionStatus: existing?.submissionStatus || 'draft',
      });
      return next;
    });
  };

  const updateStudentFlag = (studentId: string, flag: MarkFlag) => {
    setStudentMarks((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId) || {
        studentId,
        marksObtained: '',
        grade: '',
        flag: '' as MarkFlag,
        submissionStatus: 'draft' as const,
      };
      next.set(studentId, {
        ...existing,
        flag,
        marksObtained: flag === 'absent' ? '0' : existing.marksObtained,
        grade: flag === 'absent' ? 'F' : existing.grade,
      });
      return next;
    });
  };

  const persistMarks = async (submissionStatus: 'draft' | 'submitted') => {
    if (!selectedClass || !selectedExamType || !user || !students) return;

    const marksToSubmit = Array.from(studentMarks.values()).filter(
      (m) => m.marksObtained !== '' || m.flag === 'absent' || m.flag === 'malpractice',
    );

    if (marksToSubmit.length === 0) {
      toast.error('Enter marks or mark absent/malpractice for at least one student');
      return;
    }

    setIsSubmitting(true);

    try {
      const marksData = marksToSubmit.map((mark) => ({
        student_id: mark.studentId,
        subject_id: selectedClass.subject_id,
        exam_type_id: selectedExamType,
        class_id: selectedClass.class_id,
        marks_obtained: parseFloat(mark.marksObtained || '0'),
        max_marks: parseFloat(maxMarks),
        grade: mark.flag === 'absent' ? 'AB' : mark.grade,
        flag: mark.flag || null,
        submission_status: submissionStatus,
        entered_by: user.id,
      }));

      const { error } = await db.from('marks').upsert(marksData, {
        onConflict: 'student_id,subject_id,exam_type_id',
        ignoreDuplicates: false,
      });

      if (error) throw error;

      toast.success(
        submissionStatus === 'submitted'
          ? 'Marks submitted for moderation'
          : 'Draft saved',
      );
      setExistingMarks(true);
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      queryClient.invalidateQueries({ queryKey: ['result-workflow'] });

      // Refresh local state with new submission status
      setStudentMarks((prev) => {
        const next = new Map(prev);
        for (const [k, v] of next) next.set(k, { ...v, submissionStatus });
        return next;
      });
    } catch (error: any) {
      console.error('Error saving marks:', error);
      toast.error(error.message || 'Failed to save marks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'bg-green-100 text-green-700';
    if (grade === 'B+' || grade === 'B') return 'bg-blue-100 text-blue-700';
    if (grade === 'C') return 'bg-yellow-100 text-yellow-700';
    if (grade === 'D') return 'bg-orange-100 text-orange-700';
    if (grade === 'AB') return 'bg-gray-100 text-gray-700';
    return 'bg-red-100 text-red-700';
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enter Marks</h1>
        <p className="text-muted-foreground">
          Save as draft while you work, submit for moderation when done.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Class &amp; Subject</label>
              <Select value={selectedClass?.class_id || ''} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses?.map((cls) => (
                    <SelectItem key={`${cls.class_id}-${cls.subject_id}`} value={cls.class_id}>
                      {cls.class?.name} - {cls.class?.section} ({cls.subject?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Exam Type</label>
              <Select value={selectedExamType} onValueChange={handleExamTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes?.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Max Marks</label>
              <Input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                placeholder="100"
                disabled={isLocked}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedExamType && (
        <>
          <div className="flex flex-wrap gap-2">
            {existingMarks && (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Editing existing marks
              </Badge>
            )}
            {publication?.status === 'draft' && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                Status: Draft
              </Badge>
            )}
            {publication?.status === 'moderated' && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                <Lock className="h-3 w-3 mr-1" />
                Locked — awaiting publish
              </Badge>
            )}
            {publication?.status === 'published' && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <Lock className="h-3 w-3 mr-1" />
                Published
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Student Marks - {selectedClass.subject?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : students && students.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 py-2 px-3 font-medium text-sm text-muted-foreground bg-muted/50 rounded-lg">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Student</div>
                    <div className="col-span-2 text-center">Marks</div>
                    <div className="col-span-2 text-center">Grade</div>
                    <div className="col-span-3">Flag</div>
                  </div>

                  {students.map((student, index) => {
                    const mark = studentMarks.get(student.id);
                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-12 gap-3 items-center py-3 px-3 rounded-lg hover:bg-muted/30"
                      >
                        <div className="col-span-1 text-muted-foreground">{index + 1}</div>
                        <div className="col-span-4 flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={student.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {student.profile?.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{student.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Roll: {student.roll_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={mark?.marksObtained || ''}
                            onChange={(e) => updateStudentMark(student.id, e.target.value)}
                            placeholder={`/${maxMarks}`}
                            className="text-center"
                            disabled={isLocked || mark?.flag === 'absent'}
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          {mark?.grade && (
                            <Badge className={getGradeColor(mark.grade)}>{mark.grade}</Badge>
                          )}
                        </div>
                        <div className="col-span-3">
                          <Select
                            value={mark?.flag || 'none'}
                            onValueChange={(v) =>
                              updateStudentFlag(student.id, (v === 'none' ? '' : v) as MarkFlag)
                            }
                            disabled={isLocked}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="malpractice">Malpractice</SelectItem>
                              <SelectItem value="re_exam">Re-exam</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No students found in this class
                </div>
              )}
            </CardContent>
          </Card>

          {students && students.length > 0 && !isLocked && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => persistMarks('draft')}
                disabled={isSubmitting || studentMarks.size === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                size="lg"
                onClick={() => persistMarks('submitted')}
                disabled={isSubmitting || studentMarks.size === 0}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit for Moderation
              </Button>
            </div>
          )}

          {isLocked && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-4 text-sm">
                <p className="font-medium">These marks are locked.</p>
                <p className="text-muted-foreground">
                  Contact the administrator to revert the publication status if you need to make changes.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedClass && teacherClasses && teacherClasses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any classes assigned yet. Please contact the administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
