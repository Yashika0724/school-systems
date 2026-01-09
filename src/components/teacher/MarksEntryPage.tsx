import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Loader2, AlertCircle } from 'lucide-react';
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

interface StudentMark {
  studentId: string;
  marksObtained: string;
  grade: string;
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

  const { data: students, isLoading: studentsLoading } = useClassStudents(selectedClass?.class_id || null);

  const fetchExistingMarks = async (classId: string, subjectId: string, examTypeId: string) => {
    const { data, error } = await supabase
      .from('marks')
      .select('student_id, marks_obtained, max_marks, grade')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('exam_type_id', examTypeId);

    if (error) {
      console.error('Error fetching marks:', error);
      return;
    }

    if (data && data.length > 0) {
      const marks = new Map<string, StudentMark>();
      data.forEach(record => {
        marks.set(record.student_id, {
          studentId: record.student_id,
          marksObtained: record.marks_obtained.toString(),
          grade: record.grade || '',
        });
      });
      setStudentMarks(marks);
      setMaxMarks(data[0].max_marks.toString());
      setExistingMarks(true);
    } else {
      setStudentMarks(new Map());
      setExistingMarks(false);
    }
  };

  const handleClassChange = (classId: string) => {
    const cls = teacherClasses?.find(c => c.class_id === classId);
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

    setStudentMarks(prev => {
      const next = new Map(prev);
      next.set(studentId, {
        studentId,
        marksObtained: marks,
        grade,
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedClass || !selectedExamType || !user || !students) return;

    const marksToSubmit = Array.from(studentMarks.values()).filter(m => m.marksObtained !== '');
    
    if (marksToSubmit.length === 0) {
      toast.error('Please enter marks for at least one student');
      return;
    }

    setIsSubmitting(true);

    try {
      const marksData = marksToSubmit.map(mark => ({
        student_id: mark.studentId,
        subject_id: selectedClass.subject_id,
        exam_type_id: selectedExamType,
        class_id: selectedClass.class_id,
        marks_obtained: parseFloat(mark.marksObtained),
        max_marks: parseFloat(maxMarks),
        grade: mark.grade,
        entered_by: user.id,
      }));

      const { error } = await supabase
        .from('marks')
        .upsert(marksData, {
          onConflict: 'student_id,subject_id,exam_type_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast.success('Marks saved successfully!');
      setExistingMarks(true);
      queryClient.invalidateQueries({ queryKey: ['marks'] });
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
        <p className="text-muted-foreground">Select class, exam type and enter student marks</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Class & Subject</label>
              <Select
                value={selectedClass?.class_id || ''}
                onValueChange={handleClassChange}
              >
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
              <Select
                value={selectedExamType}
                onValueChange={handleExamTypeChange}
              >
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marks Entry */}
      {selectedClass && selectedExamType && (
        <>
          {existingMarks && (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Editing existing marks for this exam
            </Badge>
          )}

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
                  <div className="grid grid-cols-12 gap-4 py-2 px-3 font-medium text-sm text-muted-foreground bg-muted/50 rounded-lg">
                    <div className="col-span-1">#</div>
                    <div className="col-span-5">Student</div>
                    <div className="col-span-3 text-center">Marks</div>
                    <div className="col-span-3 text-center">Grade</div>
                  </div>

                  {students.map((student, index) => {
                    const mark = studentMarks.get(student.id);
                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-12 gap-4 items-center py-3 px-3 rounded-lg hover:bg-muted/30"
                      >
                        <div className="col-span-1 text-muted-foreground">
                          {index + 1}
                        </div>
                        <div className="col-span-5 flex items-center gap-3">
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
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={mark?.marksObtained || ''}
                            onChange={(e) => updateStudentMark(student.id, e.target.value)}
                            placeholder={`/${maxMarks}`}
                            className="text-center"
                          />
                        </div>
                        <div className="col-span-3 text-center">
                          {mark?.grade && (
                            <Badge className={getGradeColor(mark.grade)}>
                              {mark.grade}
                            </Badge>
                          )}
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

          {/* Submit Button */}
          {students && students.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || studentMarks.size === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {existingMarks ? 'Update Marks' : 'Save Marks'}
                  </>
                )}
              </Button>
            </div>
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
