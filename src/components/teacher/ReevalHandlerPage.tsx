import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Scale, CheckCircle, XCircle, Eye } from 'lucide-react';
import {
  useMyReevaluations,
  useTeacherReviewReeval,
  type ReevalStatus,
} from '@/hooks/useReevaluation';

const statusBadge = (status: ReevalStatus) => {
  if (status === 'pending') return <Badge variant="secondary">Pending</Badge>;
  if (status === 'in_review')
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">In review</Badge>;
  if (status === 'approved')
    return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
};

export function ReevalHandlerPage() {
  const { data: requests, isLoading } = useMyReevaluations();
  const review = useTeacherReviewReeval();

  const [filter, setFilter] = useState<ReevalStatus | 'all'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revised, setRevised] = useState<string>('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(
    () =>
      (requests || []).filter((r) => (filter === 'all' ? true : r.status === filter)),
    [requests, filter],
  );

  const selected = requests?.find((r) => r.id === selectedId);

  const handleAction = async (
    id: string,
    status: 'in_review' | 'approved' | 'rejected',
  ) => {
    await review.mutateAsync({
      id,
      status,
      revised_marks: revised === '' ? null : parseFloat(revised),
      teacher_notes: notes || undefined,
    });
    setSelectedId(null);
    setRevised('');
    setNotes('');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Re-evaluation Queue
          </h1>
          <p className="text-muted-foreground">
            Review requests, set revised marks, then forward to admin for final approval.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as ReevalStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No requests in this bucket.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Revised</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {r.mark?.student?.profile?.full_name || '—'}
                        </p>
                        {r.mark?.student?.roll_number && (
                          <p className="text-xs text-muted-foreground">
                            Roll {r.mark.student.roll_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{r.mark?.subject?.name}</TableCell>
                    <TableCell>{r.mark?.exam_type?.name}</TableCell>
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
                    <TableCell className="text-right">
                      <Dialog
                        open={selectedId === r.id}
                        onOpenChange={(o) => {
                          setSelectedId(o ? r.id : null);
                          if (o) {
                            setRevised(
                              r.revised_marks !== null ? String(r.revised_marks) : '',
                            );
                            setNotes(r.teacher_notes || '');
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Review Request</DialogTitle>
                          </DialogHeader>
                          {selected && (
                            <div className="space-y-3 py-2">
                              <div className="bg-muted/40 rounded p-3 space-y-1 text-sm">
                                <p>
                                  <strong>Student:</strong>{' '}
                                  {selected.mark?.student?.profile?.full_name}
                                </p>
                                <p>
                                  <strong>Subject:</strong> {selected.mark?.subject?.name}
                                </p>
                                <p>
                                  <strong>Exam:</strong> {selected.mark?.exam_type?.name}
                                </p>
                                <p>
                                  <strong>Original:</strong> {selected.original_marks}/
                                  {selected.mark?.max_marks}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <Label>Student's reason</Label>
                                <div className="text-sm italic bg-background rounded border p-2">
                                  {selected.reason}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label>Revised Marks</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={selected.mark?.max_marks}
                                  value={revised}
                                  onChange={(e) => setRevised(e.target.value)}
                                  placeholder="Leave blank to keep original"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Teacher Notes</Label>
                                <Textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleAction(selected.id, 'rejected')}
                                  disabled={review.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleAction(selected.id, 'in_review')}
                                  disabled={review.isPending}
                                >
                                  Save Progress
                                </Button>
                                <Button
                                  className="flex-1"
                                  onClick={() => handleAction(selected.id, 'approved')}
                                  disabled={review.isPending || revised === ''}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Forward
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                "Forward" marks the teacher decision as approved and sends it to
                                admin for final sign-off.
                              </p>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
