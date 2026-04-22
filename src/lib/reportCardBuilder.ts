import { supabase } from '@/integrations/supabase/client';
import type { GradingBand } from '@/hooks/useGradingScales';
import type { SchoolInfo } from '@/hooks/useSchoolSettings';
import type {
  ReportCardData,
  ReportCardExamSection,
  ReportCardSubjectRow,
} from '@/components/pdf/ReportCardPDF';

function gradeFor(bands: GradingBand[], pct: number): string {
  const sorted = [...bands].sort((a, b) => b.min_pct - a.min_pct);
  const match = sorted.find((b) => pct >= b.min_pct && pct <= b.max_pct);
  return match?.letter || 'N/A';
}

export interface BuildReportCardInput {
  studentId: string;
  school: SchoolInfo;
  gradingBands: GradingBand[];
  /** Filter to a single exam_type — omit for a full academic year report card */
  examTypeId?: string;
}

export async function buildReportCardData(
  input: BuildReportCardInput,
): Promise<ReportCardData> {
  const { studentId, school, gradingBands, examTypeId } = input;

  // Student + profile
  const { data: student, error: sErr } = await supabase
    .from('students')
    .select(`
      id, roll_number, admission_number,
      profile:profiles!students_user_id_fkey(full_name, date_of_birth),
      class:classes(name, section)
    `)
    .eq('id', studentId)
    .single();
  if (sErr) throw sErr;

  const profile = Array.isArray((student as any).profile)
    ? (student as any).profile[0]
    : (student as any).profile;
  const cls = Array.isArray((student as any).class)
    ? (student as any).class[0]
    : (student as any).class;

  // Marks (RLS already filters to published rows for student/parent)
  let query = supabase
    .from('marks')
    .select(`
      marks_obtained, max_marks, grade, remarks, exam_type_id,
      subject:subjects(name),
      exam_type:exam_types(id, name, weightage)
    `)
    .eq('student_id', studentId);
  if (examTypeId) query = query.eq('exam_type_id', examTypeId);

  const { data: marksRaw, error: mErr } = await query;
  if (mErr) throw mErr;

  type MarkRow = {
    marks_obtained: number;
    max_marks: number;
    grade: string | null;
    remarks: string | null;
    exam_type_id: string;
    subject: { name: string } | { name: string }[];
    exam_type:
      | { id: string; name: string; weightage: number | null }
      | { id: string; name: string; weightage: number | null }[];
  };

  const marks = ((marksRaw as MarkRow[]) || []).map((m) => ({
    ...m,
    subject: Array.isArray(m.subject) ? m.subject[0] : m.subject,
    exam_type: Array.isArray(m.exam_type) ? m.exam_type[0] : m.exam_type,
  }));

  // Group by exam_type
  const byType = new Map<
    string,
    {
      exam_type_name: string;
      weightage: number | null;
      rows: ReportCardSubjectRow[];
    }
  >();

  for (const m of marks) {
    const etId = (m.exam_type as any)?.id;
    const etName = (m.exam_type as any)?.name || 'Exam';
    const weight = (m.exam_type as any)?.weightage ?? null;
    const subjectName = (m.subject as any)?.name || 'Subject';
    const pct =
      m.max_marks > 0 ? (Number(m.marks_obtained) / Number(m.max_marks)) * 100 : 0;
    const resolvedGrade = m.grade || gradeFor(gradingBands, pct);

    const entry = byType.get(etId) || {
      exam_type_name: etName,
      weightage: weight,
      rows: [] as ReportCardSubjectRow[],
    };
    entry.rows.push({
      subject: subjectName,
      marks_obtained: Number(m.marks_obtained),
      max_marks: Number(m.max_marks),
      grade: resolvedGrade,
      remarks: m.remarks,
    });
    byType.set(etId, entry);
  }

  const sections: ReportCardExamSection[] = Array.from(byType.values()).map((entry) => {
    const total = entry.rows.reduce((s, r) => s + r.marks_obtained, 0);
    const max_total = entry.rows.reduce((s, r) => s + r.max_marks, 0);
    const pct = max_total > 0 ? (total / max_total) * 100 : 0;
    return {
      exam_type_name: entry.exam_type_name,
      weightage: entry.weightage,
      subjects: entry.rows.sort((a, b) => a.subject.localeCompare(b.subject)),
      total,
      max_total,
      percentage: pct,
      grade: gradeFor(gradingBands, pct),
    };
  });

  const overall_total = sections.reduce((s, sec) => s + sec.total, 0);
  const overall_max = sections.reduce((s, sec) => s + sec.max_total, 0);
  const overall_percentage = overall_max > 0 ? (overall_total / overall_max) * 100 : 0;

  return {
    school_name: school.name,
    academic_year: school.academic_year,
    student_name: profile?.full_name || '—',
    roll_number: (student as any).roll_number || null,
    admission_number: (student as any).admission_number || null,
    class_label: cls ? `${cls.name} - ${cls.section}` : '—',
    date_of_birth: profile?.date_of_birth || undefined,
    sections,
    overall_total,
    overall_max,
    overall_percentage,
    overall_grade: gradeFor(gradingBands, overall_percentage),
  };
}
