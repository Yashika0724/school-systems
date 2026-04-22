import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClassOption {
  id: string;
  name: string;
  section: string;
  academic_year: string;
}

interface StudentRow {
  id: string;
  roll_number: string | null;
  admission_number: string | null;
  class_id: string | null;
  class_label: string;
  student_name: string;
}

type Scope = 'all' | 'class';

type Status = 'present' | 'absent' | 'late' | 'excused';
const VALID_STATUSES: Status[] = ['present', 'absent', 'late', 'excused'];

interface ParsedRow {
  line: number;
  roll_number?: string;
  admission_number?: string;
  student_id?: string;
  class_id?: string;
  date: string;
  status: Status;
  remarks?: string;
  error?: string;
}

interface ResolvedRow {
  student_id: string;
  class_id: string;
  date: string;
  status: Status;
  remarks: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const csvEscape = (value: string) => {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

export function AttendanceBulkImportPage() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [resolved, setResolved] = useState<ResolvedRow[]>([]);
  const [invalid, setInvalid] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateScope, setTemplateScope] = useState<Scope>('all');
  const [templateClassId, setTemplateClassId] = useState<string>('');
  const [templateDate, setTemplateDate] = useState<string>(todayISO());
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!templateOpen || classes.length > 0 || classesLoading) return;
    setClassesLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section, academic_year')
        .order('name', { ascending: true });
      if (error) {
        toast.error(`Failed to load classes: ${error.message}`);
      } else {
        setClasses((data ?? []) as ClassOption[]);
      }
      setClassesLoading(false);
    })();
  }, [templateOpen, classes.length, classesLoading]);

  const resetState = () => {
    setRows([]);
    setResolved([]);
    setInvalid([]);
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (file: File) => {
    setParsing(true);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: async (results) => {
        const parsed: ParsedRow[] = results.data.map((row, i) => {
          const date = (row.date ?? '').trim();
          const statusRaw = (row.status ?? '').trim().toLowerCase();
          const status = VALID_STATUSES.includes(statusRaw as Status)
            ? (statusRaw as Status)
            : null;
          const base: ParsedRow = {
            line: i + 2,
            roll_number: row.roll_number?.trim() || undefined,
            admission_number: row.admission_number?.trim() || undefined,
            student_id: row.student_id?.trim() || undefined,
            class_id: row.class_id?.trim() || undefined,
            date,
            status: status ?? 'present',
            remarks: row.remarks?.trim() || undefined,
          };
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return { ...base, error: 'Invalid date (expected YYYY-MM-DD)' };
          }
          if (!status) {
            return { ...base, error: `Invalid status "${statusRaw}"` };
          }
          if (!base.student_id && !base.roll_number && !base.admission_number) {
            return { ...base, error: 'Missing student_id/roll_number/admission_number' };
          }
          return base;
        });

        const invalidRows = parsed.filter((r) => r.error);
        const okRows = parsed.filter((r) => !r.error);

        // Resolve student_id + class_id for rows using roll_number/admission_number.
        const needsLookup = okRows.filter((r) => !r.student_id || !r.class_id);
        const rolls = Array.from(
          new Set(needsLookup.map((r) => r.roll_number).filter(Boolean) as string[]),
        );
        const adms = Array.from(
          new Set(needsLookup.map((r) => r.admission_number).filter(Boolean) as string[]),
        );

        const byRoll = new Map<string, { id: string; class_id: string }>();
        const byAdm = new Map<string, { id: string; class_id: string }>();

        if (rolls.length > 0) {
          const { data } = await supabase
            .from('students')
            .select('id, class_id, roll_number')
            .in('roll_number', rolls);
          (data ?? []).forEach((s) => {
            if (s.roll_number) byRoll.set(s.roll_number, { id: s.id, class_id: s.class_id });
          });
        }
        if (adms.length > 0) {
          const { data } = await supabase
            .from('students')
            .select('id, class_id, admission_number')
            .in('admission_number', adms);
          (data ?? []).forEach((s) => {
            if (s.admission_number)
              byAdm.set(s.admission_number, { id: s.id, class_id: s.class_id });
          });
        }

        const finalValid: ResolvedRow[] = [];
        const finalInvalid: ParsedRow[] = [...invalidRows];

        okRows.forEach((r) => {
          let sid = r.student_id;
          let cid = r.class_id;
          if ((!sid || !cid) && r.roll_number && byRoll.has(r.roll_number)) {
            const m = byRoll.get(r.roll_number)!;
            sid = sid || m.id;
            cid = cid || m.class_id;
          }
          if ((!sid || !cid) && r.admission_number && byAdm.has(r.admission_number)) {
            const m = byAdm.get(r.admission_number)!;
            sid = sid || m.id;
            cid = cid || m.class_id;
          }
          if (!sid || !cid) {
            finalInvalid.push({ ...r, error: 'Student not found' });
            return;
          }
          finalValid.push({
            student_id: sid,
            class_id: cid,
            date: r.date,
            status: r.status,
            remarks: r.remarks ?? null,
          });
        });

        setRows(parsed);
        setResolved(finalValid);
        setInvalid(finalInvalid);
        setParsing(false);
      },
      error: (err) => {
        setParsing(false);
        toast.error(`Failed to parse: ${err.message}`);
      },
    });
  };

  const handleSubmit = async () => {
    if (resolved.length === 0) return;
    setSubmitting(true);
    try {
      const payload = resolved.map((r) => ({
        ...r,
        marked_by: user?.id ?? null,
      }));
      const { error } = await supabase
        .from('attendance')
        .upsert(payload, { onConflict: 'student_id,date' });
      if (error) throw error;
      toast.success(`Imported ${resolved.length} attendance record(s)`);
      resetState();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerCsvDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEmptyTemplate = () => {
    const csv = [
      'roll_number,admission_number,student_name,class,date,status,remarks',
      `,,,,${todayISO()},present,`,
      `,,,,${todayISO()},absent,Sick`,
    ].join('\n');
    triggerCsvDownload(csv, 'attendance-template-blank.csv');
  };

  const generatePrefilledTemplate = async () => {
    if (!templateDate || !/^\d{4}-\d{2}-\d{2}$/.test(templateDate)) {
      toast.error('Pick a valid date (YYYY-MM-DD).');
      return;
    }
    if (templateScope === 'class' && !templateClassId) {
      toast.error('Select a class.');
      return;
    }

    setGenerating(true);
    try {
      let query = supabase
        .from('students')
        .select(
          'id, roll_number, admission_number, class_id, classes(name, section), profiles!students_user_id_fkey_profiles(full_name)',
        );
      if (templateScope === 'class') {
        query = query.eq('class_id', templateClassId);
      }
      const { data, error } = await query;
      if (error) throw error;

      const classMap = new Map(classes.map((c) => [c.id, `${c.name} - ${c.section}`]));
      const students: StudentRow[] = (data ?? []).map((s: any) => ({
        id: s.id,
        roll_number: s.roll_number,
        admission_number: s.admission_number,
        class_id: s.class_id,
        class_label: s.classes
          ? `${s.classes.name} - ${s.classes.section}`
          : (s.class_id && classMap.get(s.class_id)) || '',
        student_name: s.profiles?.full_name ?? '',
      }));

      if (students.length === 0) {
        toast.error('No students match that selection.');
        return;
      }

      students.sort((a, b) => {
        const c = a.class_label.localeCompare(b.class_label);
        if (c !== 0) return c;
        const ar = a.roll_number ?? '';
        const br = b.roll_number ?? '';
        return ar.localeCompare(br, undefined, { numeric: true });
      });

      const header =
        'roll_number,admission_number,student_name,class,date,status,remarks';
      const lines = students.map((s) =>
        [
          csvEscape(s.roll_number ?? ''),
          csvEscape(s.admission_number ?? ''),
          csvEscape(s.student_name),
          csvEscape(s.class_label),
          templateDate,
          '',
          '',
        ].join(','),
      );
      const csv = [header, ...lines].join('\n');

      const scopeTag =
        templateScope === 'class'
          ? (classMap.get(templateClassId) ?? 'class').replace(/[^\w-]+/g, '_')
          : 'all';
      triggerCsvDownload(csv, `attendance-${scopeTag}-${templateDate}.csv`);
      toast.success(`Template generated for ${students.length} student(s).`);
      setTemplateOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate template';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bulk Attendance Import</h1>
          <p className="text-muted-foreground">
            Upload a CSV to create or update attendance records for many students at once.
          </p>
        </div>
        <Button variant="outline" onClick={() => setTemplateOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Download template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Columns:</strong>{' '}
            <code>roll_number</code> or <code>admission_number</code> or <code>student_id</code>,
            <code>date</code>, <code>status</code>, <code>remarks</code> (optional).
          </p>
          <p>
            <strong>Date:</strong> <code>YYYY-MM-DD</code>.{' '}
            <strong>Status:</strong> <code>present</code> / <code>absent</code> /{' '}
            <code>late</code> / <code>excused</code>.
          </p>
          <p className="text-muted-foreground">
            When you use roll_number or admission_number, the importer resolves the student's
            class automatically. Rows that can't be resolved are rejected.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              size="lg"
              onClick={() => inputRef.current?.click()}
              disabled={parsing || submitting}
            >
              {parsing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Choose CSV file
            </Button>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {fileName}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total rows</p>
                <p className="text-2xl font-bold">{rows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Will import</p>
                <p className="text-2xl font-bold">{resolved.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Will skip</p>
                <p className="text-2xl font-bold">{invalid.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {invalid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Rejected rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {invalid.slice(0, 100).map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded bg-red-50/40">
                  <Badge variant="destructive">Line {r.line}</Badge>
                  <span className="flex-1">{r.error}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.roll_number || r.admission_number || r.student_id} • {r.date}
                  </span>
                </div>
              ))}
              {invalid.length > 100 && (
                <p className="text-muted-foreground text-xs py-2">
                  + {invalid.length - 100} more rejected rows.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {resolved.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetState} disabled={submitting}>
            Clear
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Import {resolved.length} records
          </Button>
        </div>
      )}

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download attendance template</DialogTitle>
            <DialogDescription>
              Pick a scope and date. We'll prefill student rows so you only need to fill in the
              status (and optional remarks).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              <RadioGroup
                value={templateScope}
                onValueChange={(v) => setTemplateScope(v as Scope)}
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                    All students
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="class" id="scope-class" />
                  <Label htmlFor="scope-class" className="font-normal cursor-pointer">
                    Specific class
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {templateScope === 'class' && (
              <div className="space-y-2">
                <Label htmlFor="template-class">Class</Label>
                <Select
                  value={templateClassId}
                  onValueChange={setTemplateClassId}
                  disabled={classesLoading}
                >
                  <SelectTrigger id="template-class">
                    <SelectValue
                      placeholder={classesLoading ? 'Loading…' : 'Select a class'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {c.section}
                        {c.academic_year ? ` (${c.academic_year})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="template-date">Date</Label>
              <Input
                id="template-date"
                type="date"
                value={templateDate}
                onChange={(e) => setTemplateDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Prefilled in every row. You can edit individual dates later in the CSV.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={downloadEmptyTemplate}
              disabled={generating}
            >
              Blank template
            </Button>
            <Button onClick={generatePrefilledTemplate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate &amp; download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
