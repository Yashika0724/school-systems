import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Scale, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReevaluations, useCreateReevaluation, type ReevalStatus } from '@/hooks/useReevaluation';

const statusBadge = (status: ReevalStatus) => {
  if (status === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (status === 'in_review')
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">In review</Badge>;
  if (status === 'approved')
    return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
};

export function StudentReevalPage() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useMyReevaluations();
  const create = useCreateReevaluation();

  const { data: student } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: marks } = useQuery({
    queryKey: ['student-marks-for-reeval', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('marks')
        .select(`
          id, marks_obtained, max_marks, grade,
          subject:subjects(name),
          exam_type:exam_types(name)
        `)
        .eq('student_id', student.id)
        .eq('submission_status', 'submitted');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
        exam_type: Array.isArray(r.exam_type) ? r.exam_type[0] : r.exam_type,
      }));
    },
    enabled: !!student,
  });

  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const existingByMarkId = useMemo(() => {
    const map = new Map<string, ReevalStatus>();
    (requests || []).forEach((r) => map.set(r.marks_id, r.status));
    return map;
  }, [requests]);

  const handleSubmit = async (marksId: string) => {
    if (!reason.trim()) return;
    await create.mutateAsync({ marks_id: marksId, reason: reason.trim() });
    setDialogOpen(null);
    setReason('');
  };

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
          <Scale className="h-6 w-6" />
          Re-evaluation Requests
        </h1>
        <p className="text-muted-foreground">
          If you feel a mark is wrong, request a re-evaluation. Your teacher reviews first, then
          the admin decides.
        </p>
      </div>

      {requests && requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Revised</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.mark?.subject?.name || '—'}</TableCell>
                    <TableCell>{r.mark?.exam_type?.name || '—'}</TableCell>
                    <TableCell>
                      {r.original_marks}/{r.mark?.max_marks ?? '—'}
                    </TableCell>
                    <TableCell>
                      {r.revised_marks !== null ? (
                        <Badge className="bg-green-100 text-green-700">
                          {r.revised_marks}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {r.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Marks</CardTitle>
        </CardHeader>
        <CardContent>
          {!marks || marks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No marks to request re-evaluation for yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marks.map((m: any) => {
                  const existing = existingByMarkId.get(m.id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.subject?.name}</TableCell>
                      <TableCell>{m.exam_type?.name}</TableCell>
                      <TableCell>
                        {m.marks_obtained}/{m.max_marks}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.grade || '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {existing ? (
                          statusBadge(existing)
                        ) : (
                          <Dialog
                            open={dialogOpen === m.id}
                            onOpenChange={(o) => setDialogOpen(o ? m.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Request Re-eval
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Request re-evaluation — {m.subject?.name}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 py-2">
                                <div className="text-sm bg-muted/40 p-2 rounded">
                                  Current marks:{' '}
                                  <strong>
                                    {m.marks_obtained}/{m.max_marks}
                                  </strong>{' '}
                                  ({m.grade || '—'})
                                </div>
                                <div className="space-y-1">
                                  <Label>Reason *</Label>
                                  <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    placeholder="Explain why you think the mark should be revised"
                                  />
                                </div>
                                <Button
                                  className="w-full"
                                  disabled={create.isPending || !reason.trim()}
                                  onClick={() => handleSubmit(m.id)}
                                >
                                  {create.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                  )}
                                  Submit Request
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
