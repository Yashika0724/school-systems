import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarkAnalyticsRow {
  id: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  flag: string | null;
  student_id: string;
  class_id: string;
  subject_id: string;
  exam_type_id: string;
  student_name: string;
  class_label: string;
  subject_name: string;
  exam_type_name: string;
  percentage: number;
}

interface RawRow {
  id: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  flag: string | null;
  student_id: string;
  class_id: string;
  subject_id: string;
  exam_type_id: string;
  student?: {
    profile?: { full_name: string } | { full_name: string }[] | null;
  } | Array<{ profile?: { full_name: string } | { full_name: string }[] | null }> | null;
  class?: { name: string; section: string } | { name: string; section: string }[] | null;
  subject?: { name: string } | { name: string }[] | null;
  exam_type?: { name: string } | { name: string }[] | null;
}

const db = supabase as unknown as { from: (table: string) => any };

export function useExamAnalyticsData(params: {
  exam_type_id?: string | null;
  class_id?: string | null;
  teacher_scope?: boolean;
}) {
  return useQuery({
    queryKey: ['exam-analytics', params],
    queryFn: async (): Promise<MarkAnalyticsRow[]> => {
      let query = db
        .from('marks')
        .select(`
          id, marks_obtained, max_marks, grade, flag,
          student_id, class_id, subject_id, exam_type_id,
          student:students(
            profile:profiles!students_user_id_fkey(full_name)
          ),
          class:classes(name, section),
          subject:subjects(name),
          exam_type:exam_types(name)
        `)
        .eq('submission_status', 'submitted');

      if (params.exam_type_id) query = query.eq('exam_type_id', params.exam_type_id);
      if (params.class_id) query = query.eq('class_id', params.class_id);

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as RawRow[]).map((r): MarkAnalyticsRow => {
        const student = Array.isArray(r.student) ? r.student[0] : r.student;
        const profile = Array.isArray(student?.profile)
          ? student?.profile[0]
          : student?.profile;
        const cls = Array.isArray(r.class) ? r.class[0] : r.class;
        const sub = Array.isArray(r.subject) ? r.subject[0] : r.subject;
        const et = Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type;
        const pct = r.max_marks > 0 ? (Number(r.marks_obtained) / Number(r.max_marks)) * 100 : 0;
        return {
          id: r.id,
          marks_obtained: Number(r.marks_obtained),
          max_marks: Number(r.max_marks),
          grade: r.grade,
          flag: r.flag,
          student_id: r.student_id,
          class_id: r.class_id,
          subject_id: r.subject_id,
          exam_type_id: r.exam_type_id,
          student_name: profile?.full_name || 'Student',
          class_label: cls ? `${cls.name}-${cls.section}` : '',
          subject_name: sub?.name || '',
          exam_type_name: et?.name || '',
          percentage: pct,
        };
      });
    },
  });
}

export interface AnalyticsSummary {
  total: number;
  passed: number;
  pass_pct: number;
  avg_pct: number;
  grade_distribution: Array<{ grade: string; count: number }>;
  subject_averages: Array<{ subject: string; avg_pct: number; count: number }>;
  class_averages: Array<{ class_label: string; avg_pct: number; count: number }>;
  top_performers: Array<{
    student_id: string;
    student_name: string;
    total: number;
    max: number;
    pct: number;
  }>;
  percentage_buckets: Array<{ bucket: string; count: number }>;
}

export function summarize(rows: MarkAnalyticsRow[]): AnalyticsSummary {
  if (rows.length === 0) {
    return {
      total: 0,
      passed: 0,
      pass_pct: 0,
      avg_pct: 0,
      grade_distribution: [],
      subject_averages: [],
      class_averages: [],
      top_performers: [],
      percentage_buckets: [],
    };
  }

  const passing = rows.filter((r) => r.percentage >= 40 && r.flag !== 'malpractice');
  const avg = rows.reduce((s, r) => s + r.percentage, 0) / rows.length;

  const gradeMap = new Map<string, number>();
  const subjectMap = new Map<string, { sum: number; count: number }>();
  const classMap = new Map<string, { sum: number; count: number }>();
  const studentMap = new Map<string, { name: string; total: number; max: number }>();

  for (const r of rows) {
    gradeMap.set(r.grade || '—', (gradeMap.get(r.grade || '—') || 0) + 1);

    const sKey = r.subject_name;
    const s = subjectMap.get(sKey) || { sum: 0, count: 0 };
    s.sum += r.percentage;
    s.count += 1;
    subjectMap.set(sKey, s);

    const cKey = r.class_label;
    const c = classMap.get(cKey) || { sum: 0, count: 0 };
    c.sum += r.percentage;
    c.count += 1;
    classMap.set(cKey, c);

    const stu = studentMap.get(r.student_id) || { name: r.student_name, total: 0, max: 0 };
    stu.total += r.marks_obtained;
    stu.max += r.max_marks;
    studentMap.set(r.student_id, stu);
  }

  const buckets = [
    { bucket: '0-40', min: 0, max: 40, count: 0 },
    { bucket: '40-60', min: 40, max: 60, count: 0 },
    { bucket: '60-75', min: 60, max: 75, count: 0 },
    { bucket: '75-90', min: 75, max: 90, count: 0 },
    { bucket: '90-100', min: 90, max: 101, count: 0 },
  ];
  for (const r of rows) {
    const b = buckets.find((x) => r.percentage >= x.min && r.percentage < x.max);
    if (b) b.count += 1;
  }

  return {
    total: rows.length,
    passed: passing.length,
    pass_pct: (passing.length / rows.length) * 100,
    avg_pct: avg,
    grade_distribution: Array.from(gradeMap.entries()).map(([grade, count]) => ({
      grade,
      count,
    })),
    subject_averages: Array.from(subjectMap.entries())
      .map(([subject, v]) => ({ subject, avg_pct: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg_pct - a.avg_pct),
    class_averages: Array.from(classMap.entries())
      .map(([class_label, v]) => ({
        class_label,
        avg_pct: v.sum / v.count,
        count: v.count,
      }))
      .sort((a, b) => b.avg_pct - a.avg_pct),
    top_performers: Array.from(studentMap.entries())
      .map(([student_id, v]) => ({
        student_id,
        student_name: v.name,
        total: v.total,
        max: v.max,
        pct: v.max > 0 ? (v.total / v.max) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5),
    percentage_buckets: buckets.map((b) => ({ bucket: b.bucket, count: b.count })),
  };
}
