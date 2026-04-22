import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface AttendanceReportRow {
  date: string;
  status: string;
  remarks?: string | null;
}

export interface AttendanceReportData {
  school_name: string;
  period_label: string;
  student_name: string;
  class_label: string;
  roll_number: string | null;
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    workingDays: number;
    percent: number;
    threshold: number;
  };
  rows: AttendanceReportRow[];
  generated_on: string;
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
  meta: { fontSize: 9, color: '#555', marginTop: 2 },
  studentGrid: { flexDirection: 'row', marginBottom: 12 },
  col: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 90, color: '#555', fontWeight: 'bold' },
  value: { flex: 1 },
  summary: {
    flexDirection: 'row',
    marginVertical: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  summaryBox: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },
  summaryLabel: { fontSize: 8, color: '#666', marginTop: 2 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 6,
  },
  cellDate: { width: 110 },
  cellStatus: { width: 70 },
  cellRemarks: { flex: 1 },
  footer: {
    marginTop: 14,
    fontSize: 8,
    color: '#888',
    textAlign: 'center',
  },
  warning: {
    marginTop: 8,
    padding: 6,
    backgroundColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    fontSize: 9,
  },
});

function statusColor(status: string): string {
  switch (status) {
    case 'present':
      return '#059669';
    case 'absent':
      return '#dc2626';
    case 'late':
      return '#d97706';
    case 'excused':
      return '#2563eb';
    default:
      return '#64748b';
  }
}

export function AttendanceReportPDF({ data }: { data: AttendanceReportData }) {
  const belowThreshold = data.stats.percent < data.stats.threshold;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{data.school_name}</Text>
          <Text style={styles.title}>ATTENDANCE REPORT</Text>
          <Text style={styles.meta}>{data.period_label}</Text>
        </View>

        <View style={styles.studentGrid}>
          <View style={styles.col}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Student:</Text>
              <Text style={styles.value}>{data.student_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Class:</Text>
              <Text style={styles.value}>{data.class_label}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Roll No:</Text>
              <Text style={styles.value}>{data.roll_number ?? 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Generated:</Text>
              <Text style={styles.value}>{data.generated_on}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              {data.stats.percent}%
            </Text>
            <Text style={styles.summaryLabel}>Attendance</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data.stats.present}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data.stats.absent}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data.stats.late}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data.stats.excused}</Text>
            <Text style={styles.summaryLabel}>Excused</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data.stats.workingDays}</Text>
            <Text style={styles.summaryLabel}>Working Days</Text>
          </View>
        </View>

        {belowThreshold && (
          <View style={styles.warning}>
            <Text>
              Attendance is below the minimum threshold of {data.stats.threshold}%.
            </Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDate}>Date</Text>
            <Text style={styles.cellStatus}>Status</Text>
            <Text style={styles.cellRemarks}>Remarks</Text>
          </View>
          {data.rows.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cellDate}>{r.date}</Text>
              <Text style={[styles.cellStatus, { color: statusColor(r.status) }]}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </Text>
              <Text style={styles.cellRemarks}>{r.remarks ?? '-'}</Text>
            </View>
          ))}
          {data.rows.length === 0 && (
            <Text style={{ padding: 6, color: '#888' }}>No attendance records.</Text>
          )}
        </View>

        <Text style={styles.footer}>
          This report was generated automatically. Percentages may change as new records are
          added or justifications are approved.
        </Text>
      </Page>
    </Document>
  );
}
