import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Download, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, useClassStudents, useExamTypes, type TeacherClass } from '@/hooks/useTeacherClasses';
import { usePublicationStatus } from '@/hooks/useResultPublications';

type FlagValue = 'absent' | 'malpractice' | 're_exam' | '';

interface ParsedRow {
  roll_number: string;
  marks_obtained: string;
  flag?: string;
  _resolvedStudentId?: string;
  _resolvedName?: string;
  _error?: string;
}

function calculateGrade(marks: number, max: number): string {
  const p = max > 0 ? (marks / max) * 100 : 0;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
}

const db = supabase as unknown as { from: (table: string) => any };

export function BulkMarksUploadPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: teacherClasses } = useTeacherClasses();
  const { data: examTypes } = useExamTypes();

  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<string>('100');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: students } = useClassStudents(selectedClass?.class_id || null);
  const { data: publication } = usePublicationStatus(
    selectedExamType || null,
    selectedClass?.class_id || null,
  );

  const isLocked =
    publication?.status === 'moderated' || publication?.status === 'published';

  const rollIndex = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of students || []) {
      if (s.roll_number) {
        map.set(s.roll_number.trim().toLowerCase(), {
          id: s.id,
          name: s.profile?.full_name || '',
        });
      }
    }
    return map;
  }, [students]);

  const validate = (parsed: ParsedRow[]): ParsedRow[] => {
    const max = parseFloat(maxMarks) || 100;
    return parsed.map((r) => {
      const roll = (r.roll_number || '').trim();
      if (!roll) return { ...r, _error: 'Missing roll number' };

      const match = rollIndex.get(roll.toLowerCase());
      if (!match) return { ...r, _error: 'Roll not in class' };

      const flag = (r.flag || '').trim().toLowerCase() as FlagValue;
      if (flag && !['absent', 'malpractice', 're_exam'].includes(flag)) {
        return { ...r, _error: 'Invalid flag (absent/malpractice/re_exam)' };
      }

      if (flag !== 'absent' && flag !== 'malpractice') {
        const val = parseFloat(r.marks_obtained);
        if (Number.isNaN(val)) return { ...r, _error: 'Marks not a number' };
        if (val < 0 || val > max) return { ...r, _error: `Marks out of 0–${max}` };
      }

      return {
        ...r,
        flag,
        _resolvedStudentId: match.id,
        _resolvedName: match.name,
      };
    });
  };

  const handleFile = async (file: File) => {
    if (!selectedClass || !selectedExamType) {
      toast.error('Select class and exam type first');
      return;
    }

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (res) => {
        const incoming = (res.data || []) as ParsedRow[];
        setRows(validate(incoming));
      },
      error: (err) => toast.error('CSV parse failed: ' + err.message),
    });
  };

  const downloadTemplate = () => {
    const header = 'roll_number,marks_obtained,flag\n';
    const sample = (students || [])
      .slice(0, 3)
      .map((s) => `${s.roll_number || ''},,`)
      .join('\n');
    const csv = header + (sample || '101,85,\n102,,absent');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marks-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (submissionStatus: 'draft' | 'submitted') => {
    if (!selectedClass || !selectedExamType || !user) return;
    const valid = rows.filter((r) => !r._error && r._resolvedStudentId);
    if (valid.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    setIsSaving(true);
    try {
      const max = parseFloat(maxMarks) || 100;
      const payload = valid.map((r) => {
        const isAbsent = r.flag === 'absent';
        const marksObtained = isAbsent ? 0 : parseFloat(r.marks_obtained || '0');
        return {
          student_id: r._resolvedStudentId!,
          subject_id: selectedClass.subject_id,
          exam_type_id: selectedExamType,
          class_id: selectedClass.class_id,
          marks_obtained: marksObtained,
          max_marks: max,
          grade: isAbsent ? 'AB' : calculateGrade(marksObtained, max),
          flag: r.flag || null,
          submission_status: submissionStatus,
          entered_by: user.id,
        };
      });

      const { error } = await db
        .from('marks')
        .upsert(payload, { onConflict: 'student_id,subject_id,exam_type_id' });
      if (error) throw error;

      toast.success(
        submissionStatus === 'submitted'
          ? `Submitted ${valid.length} marks for moderation`
          : `Saved ${valid.length} drafts`,
      );
      qc.invalidateQueries({ queryKey: ['marks'] });
      qc.invalidateQueries({ queryKey: ['result-workflow'] });
    } catch (e: any) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const errorCount = rows.filter((r) => r._error).length;
  const okCount = rows.length - errorCount;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          Bulk Marks Upload
        </h1>
        <p className="text-muted-foreground">
          Upload a CSV (roll_number, marks_obtained, flag) for one of your classes.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Class &amp; Subject</Label>
              <Select
                value={selectedClass?.class_id || ''}
                onValueChange={(v) => {
                  const cls = teacherClasses?.find((c) => c.class_id === v);
                  setSelectedClass(cls || null);
                  setRows([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses?.map((c) => (
                    <SelectItem key={`${c.class_id}-${c.subject_id}`} value={c.class_id}>
                      {c.class?.name} - {c.class?.section} ({c.subject?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Exam Type</Label>
              <Select
                value={selectedExamType}
                onValueChange={(v) => {
                  setSelectedExamType(v);
                  setRows([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Max Marks</Label>
              <Input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate} disabled={!selectedClass}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                disabled={!selectedClass || !selectedExamType || isLocked}
              />
            </div>
          </div>
          {isLocked && (
            <p className="text-sm text-orange-600">
              This class/exam is locked — revert the publication status before re-uploading.
            </p>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Preview
              <Badge className="bg-green-100 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {okCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  <XCircle className="h-3 w-3 mr-1" />
                  {errorCount} errors
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r._error ? 'bg-red-50' : ''}>
                      <TableCell>{r.roll_number}</TableCell>
                      <TableCell>{r._resolvedName || '—'}</TableCell>
                      <TableCell>{r.marks_obtained || '—'}</TableCell>
                      <TableCell>{r.flag || '—'}</TableCell>
                      <TableCell>
                        {r._error ? (
                          <Badge variant="destructive">{r._error}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={isSaving || okCount === 0 || isLocked}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave('submitted')}
                disabled={isSaving || okCount === 0 || isLocked}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload &amp; Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
