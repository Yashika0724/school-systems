import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface ReportCardSubjectRow {
  subject: string;
  max_marks: number;
  marks_obtained: number;
  grade: string;
  remarks?: string | null;
}

export interface ReportCardExamSection {
  exam_type_name: string;
  weightage: number | null;
  subjects: ReportCardSubjectRow[];
  total: number;
  max_total: number;
  percentage: number;
  grade: string;
}

export interface ReportCardData {
  school_name: string;
  academic_year: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string | null;
  class_label: string;
  father_name?: string;
  date_of_birth?: string;
  sections: ReportCardExamSection[];
  overall_total: number;
  overall_max: number;
  overall_percentage: number;
  overall_grade: string;
  remarks?: string;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 8,
    marginBottom: 14,
    textAlign: 'center',
  },
  schoolName: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  title: { fontSize: 13, marginTop: 4, letterSpacing: 2 },
  yearLine: { fontSize: 9, marginTop: 2, color: '#444' },
  studentGrid: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 90, color: '#555', fontWeight: 'bold' },
  value: { flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    color: '#059669',
  },
  weightage: { fontSize: 8, color: '#555', marginLeft: 4 },
  table: { borderWidth: 1, borderColor: '#d1d5db', marginBottom: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: {
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#ecfdf5',
    fontSize: 9,
  },
  td: { padding: 5, fontSize: 9 },
  colSubject: { flex: 3 },
  colNum: { flex: 1, textAlign: 'center' },
  sectionTotal: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#f0fdf4',
    fontWeight: 'bold',
    fontSize: 9,
  },
  overall: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#059669',
    color: '#fff',
    borderRadius: 3,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  overallKey: { fontSize: 10, color: '#fff' },
  overallVal: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  remarks: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    fontSize: 9,
  },
  signatures: { flexDirection: 'row', marginTop: 28, justifyContent: 'space-between' },
  sigBox: { width: 150, textAlign: 'center' },
  sigLine: { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 2, fontSize: 9 },
});

export function ReportCardPDF({ data }: { data: ReportCardData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{data.school_name}</Text>
          <Text style={styles.title}>STUDENT REPORT CARD</Text>
          <Text style={styles.yearLine}>Academic Year {data.academic_year}</Text>
        </View>

        <View style={styles.studentGrid}>
          <View style={styles.col}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{data.student_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Class:</Text>
              <Text style={styles.value}>{data.class_label}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Roll No:</Text>
              <Text style={styles.value}>{data.roll_number || '—'}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Admission:</Text>
              <Text style={styles.value}>{data.admission_number || '—'}</Text>
            </View>
            {data.father_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Father:</Text>
                <Text style={styles.value}>{data.father_name}</Text>
              </View>
            ) : null}
            {data.date_of_birth ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>DOB:</Text>
                <Text style={styles.value}>{data.date_of_birth}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {data.sections.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#555' }}>
            No published results available yet.
          </Text>
        ) : (
          data.sections.map((section, i) => (
            <View key={i} wrap={false}>
              <Text style={styles.sectionTitle}>
                {section.exam_type_name}
                {section.weightage ? (
                  <Text style={styles.weightage}>  (Weight {section.weightage}%)</Text>
                ) : null}
              </Text>
              <View style={styles.table}>
                <View style={styles.tr}>
                  <Text style={[styles.th, styles.colSubject]}>Subject</Text>
                  <Text style={[styles.th, styles.colNum]}>Marks</Text>
                  <Text style={[styles.th, styles.colNum]}>Max</Text>
                  <Text style={[styles.th, styles.colNum]}>Grade</Text>
                </View>
                {section.subjects.map((s, j) => (
                  <View key={j} style={styles.tr}>
                    <Text style={[styles.td, styles.colSubject]}>{s.subject}</Text>
                    <Text style={[styles.td, styles.colNum]}>{s.marks_obtained}</Text>
                    <Text style={[styles.td, styles.colNum]}>{s.max_marks}</Text>
                    <Text style={[styles.td, styles.colNum]}>{s.grade}</Text>
                  </View>
                ))}
                <View style={styles.sectionTotal}>
                  <Text style={[styles.td, styles.colSubject]}>Total</Text>
                  <Text style={[styles.td, styles.colNum]}>{section.total}</Text>
                  <Text style={[styles.td, styles.colNum]}>{section.max_total}</Text>
                  <Text style={[styles.td, styles.colNum]}>
                    {section.percentage.toFixed(1)}% / {section.grade}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {data.sections.length > 0 && (
          <View style={styles.overall}>
            <View style={styles.overallRow}>
              <Text style={styles.overallKey}>Total Marks</Text>
              <Text style={styles.overallVal}>
                {data.overall_total} / {data.overall_max}
              </Text>
            </View>
            <View style={styles.overallRow}>
              <Text style={styles.overallKey}>Percentage</Text>
              <Text style={styles.overallVal}>{data.overall_percentage.toFixed(2)}%</Text>
            </View>
            <View style={styles.overallRow}>
              <Text style={styles.overallKey}>Overall Grade</Text>
              <Text style={styles.overallVal}>{data.overall_grade}</Text>
            </View>
          </View>
        )}

        {data.remarks ? (
          <View style={styles.remarks}>
            <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Remarks</Text>
            <Text>{data.remarks}</Text>
          </View>
        ) : null}

        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Class Teacher</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Principal</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Parent / Guardian</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
