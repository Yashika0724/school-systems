import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export interface HallTicketExamRow {
  exam_date: string;
  subject: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface HallTicketData {
  school_name: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string | null;
  class_label: string;
  exam_type_name: string;
  hall_ticket_no: string;
  room: string | null;
  seat_no: string | null;
  instructions?: string;
  exams: HallTicketExamRow[];
  qr_data_url: string;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
    paddingBottom: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  schoolName: { fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
  title: { fontSize: 14, marginTop: 4, letterSpacing: 2 },
  grid: { flexDirection: 'row', marginBottom: 14 },
  leftCol: { flex: 3, paddingRight: 12 },
  rightCol: { flex: 1, alignItems: 'center' },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 110, color: '#555', fontWeight: 'bold' },
  value: { flex: 1 },
  hallTicketBox: {
    backgroundColor: '#eef2ff',
    border: '1px solid #1e40af',
    padding: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  hallTicketText: { fontSize: 14, fontWeight: 'bold', color: '#1e40af', textAlign: 'center' },
  seatText: { textAlign: 'center', marginTop: 2, fontSize: 10 },
  qr: { width: 90, height: 90 },
  qrCaption: { fontSize: 7, marginTop: 4, color: '#555' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 4,
    color: '#1e40af',
  },
  table: { borderWidth: 1, borderColor: '#d1d5db' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  th: {
    flex: 1,
    padding: 6,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    fontSize: 9,
  },
  td: { flex: 1, padding: 6, fontSize: 9 },
  instructions: {
    marginTop: 14,
    padding: 8,
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    fontSize: 9,
    lineHeight: 1.4,
  },
  signatures: { flexDirection: 'row', marginTop: 32, justifyContent: 'space-between' },
  sigBox: { width: 150, textAlign: 'center' },
  sigLine: { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 2, fontSize: 9 },
});

const DEFAULT_INSTRUCTIONS = [
  'Carry this hall ticket and a valid photo ID to every exam.',
  'Report to the exam hall 15 minutes before the start time.',
  'Mobile phones and electronic devices are prohibited inside the hall.',
  'Any form of malpractice will result in disqualification.',
];

export function HallTicketPDF({ data }: { data: HallTicketData }) {
  const instructions = data.instructions
    ? data.instructions.split('\n').filter(Boolean)
    : DEFAULT_INSTRUCTIONS;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{data.school_name}</Text>
          <Text style={styles.title}>HALL TICKET</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.leftCol}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Student Name:</Text>
              <Text style={styles.value}>{data.student_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Class:</Text>
              <Text style={styles.value}>{data.class_label}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Roll Number:</Text>
              <Text style={styles.value}>{data.roll_number || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Admission No:</Text>
              <Text style={styles.value}>{data.admission_number || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Examination:</Text>
              <Text style={styles.value}>{data.exam_type_name}</Text>
            </View>

            <View style={styles.hallTicketBox}>
              <Text style={styles.hallTicketText}>{data.hall_ticket_no}</Text>
              <Text style={styles.seatText}>
                Room: {data.room || 'TBA'}    |    Seat: {data.seat_no || 'TBA'}
              </Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            {data.qr_data_url ? (
              <Image src={data.qr_data_url} style={styles.qr} />
            ) : null}
            <Text style={styles.qrCaption}>Scan to verify</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Examination Schedule</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={styles.th}>Date</Text>
            <Text style={styles.th}>Subject</Text>
            <Text style={styles.th}>Time</Text>
            <Text style={styles.th}>Room</Text>
          </View>
          {data.exams.length === 0 ? (
            <View style={styles.tr}>
              <Text style={styles.td}>—</Text>
              <Text style={styles.td}>No exams scheduled</Text>
              <Text style={styles.td}>—</Text>
              <Text style={styles.td}>—</Text>
            </View>
          ) : (
            data.exams.map((e, i) => (
              <View key={i} style={styles.tr}>
                <Text style={styles.td}>{e.exam_date}</Text>
                <Text style={styles.td}>{e.subject}</Text>
                <Text style={styles.td}>
                  {e.start_time} – {e.end_time}
                </Text>
                <Text style={styles.td}>{e.room || data.room || '—'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.instructions}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Instructions:</Text>
          {instructions.map((line, i) => (
            <Text key={i}>• {line}</Text>
          ))}
        </View>

        <View style={styles.signatures}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Student Signature</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Principal / Controller of Examinations</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
