import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const db = supabase as unknown as { from: (table: string) => any };

interface AttemptRow {
  id: string;
  online_exam_id: string;
  student_id: string;
  status: string;
  score: number | null;
  max_score: number | null;
  tab_switch_count: number;
  auto_submitted: boolean;
  started_at: string;
  submitted_at: string | null;
  student?: {
    id: string;
    roll_number: string | null;
    profile?: { full_name: string } | null;
    class?: { name: string; section: string } | null;
  };
  online_exam?: {
    id: string;
    exam?: {
      subject?: { name: string };
      exam_type?: { name: string };
    };
  };
}

interface ProctorEventRow {
  id: string;
  attempt_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

function useAttempts() {
  return useQuery({
    queryKey: ['proctor-attempts'],
    queryFn: async (): Promise<AttemptRow[]> => {
      const { data, error } = await db
        .from('exam_attempts')
        .select(`
          *,
          student:students(
            id, roll_number,
            profile:profiles!students_user_id_fkey(full_name),
            class:classes(name, section)
          ),
          online_exam:online_exams(
            id,
            exam:exams(
              subject:subjects(name),
              exam_type:exam_types(name)
            )
          )
        `)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        student: Array.isArray(r.student) ? r.student[0] : r.student,
        online_exam: Array.isArray(r.online_exam) ? r.online_exam[0] : r.online_exam,
      })) as AttemptRow[];
    },
  });
}

function useEvents(attempt_id: string | null) {
  return useQuery({
    queryKey: ['proctor-events', attempt_id],
    queryFn: async (): Promise<ProctorEventRow[]> => {
      if (!attempt_id) return [];
      const { data, error } = await db
        .from('proctor_events')
        .select('*')
        .eq('attempt_id', attempt_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ProctorEventRow[];
    },
    enabled: !!attempt_id,
  });
}

const EVENT_COLORS: Record<string, string> = {
  tab_switch: 'bg-red-100 text-red-700 border-red-300',
  copy_paste: 'bg-orange-100 text-orange-700 border-orange-300',
  right_click: 'bg-amber-100 text-amber-700 border-amber-300',
  fullscreen_exit: 'bg-red-100 text-red-700 border-red-300',
};

export function ProctorConsolePage() {
  const { data: attempts, isLoading } = useAttempts();
  const [filter, setFilter] = useState<string>('all');
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const { data: events } = useEvents(selectedAttempt);

  const filtered = useMemo(() => {
    if (!attempts) return [];
    if (filter === 'flagged') return attempts.filter((a) => a.tab_switch_count > 0);
    if (filter === 'in_progress') return attempts.filter((a) => a.status === 'in_progress');
    if (filter === 'submitted') return attempts.filter((a) => a.status === 'submitted');
    return attempts;
  }, [attempts, filter]);

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Proctor Console
        </h1>
        <p className="text-muted-foreground">
          Review online exam attempts and anti-cheat signals.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attempts</SelectItem>
            <SelectItem value="flagged">Flagged (tab-switches)</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No matching attempts.</p>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Tab Switches</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow
                        key={a.id}
                        className={`cursor-pointer ${
                          selectedAttempt === a.id ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedAttempt(a.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{a.student?.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.student?.class
                                ? `${a.student.class.name}-${a.student.class.section}`
                                : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {a.online_exam?.exam?.subject?.name}
                            <div className="text-xs text-muted-foreground">
                              {a.online_exam?.exam?.exam_type?.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.score !== null && a.max_score !== null
                            ? `${a.score}/${a.max_score}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {a.tab_switch_count > 0 ? (
                            <Badge className="bg-red-100 text-red-700 border-red-300">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {a.tab_switch_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a.status === 'in_progress' && <Badge>In Progress</Badge>}
                          {a.status === 'submitted' && (
                            <Badge variant="secondary">
                              Submitted{a.auto_submitted ? ' (auto)' : ''}
                            </Badge>
                          )}
                          {a.status === 'flagged' && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(a.started_at), 'dd MMM HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAttempt ? (
              <p className="text-sm text-muted-foreground">
                Click an attempt to see its events.
              </p>
            ) : !events || events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events logged.</p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-auto">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`p-2 rounded border text-xs ${
                      EVENT_COLORS[e.event_type] || ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{e.event_type}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(e.created_at), 'HH:mm:ss')}
                      </span>
                    </div>
                    {Object.keys(e.payload).length > 0 && (
                      <pre className="mt-1 text-[10px] text-muted-foreground">
                        {JSON.stringify(e.payload)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
