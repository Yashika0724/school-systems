import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarCheck, Eye, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { usePtmRequests, useTeacherRespondPtm, type PtmStatus } from '@/hooks/usePtm';

const statusBadge = (s: PtmStatus) => {
  if (s === 'requested') return <Badge variant="secondary">Pending</Badge>;
  if (s === 'accepted') return <Badge className="bg-green-100 text-green-700 border-green-300">Accepted</Badge>;
  if (s === 'completed') return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Completed</Badge>;
  if (s === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
};

export function TeacherPtmPage() {
  const { data: requests, isLoading } = usePtmRequests();
  const respond = useTeacherRespondPtm();

  const [filter, setFilter] = useState<PtmStatus | 'all'>('requested');
  const [openId, setOpenId] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  const selected = requests?.find((r) => r.id === openId);

  const filtered = (requests || []).filter((r) =>
    filter === 'all' ? true : r.status === filter,
  );

  const openDialog = (id: string) => {
    const req = requests?.find((r) => r.id === id);
    if (!req) return;
    setOpenId(id);
    setScheduled(req.scheduled_at ? req.scheduled_at.slice(0, 16) : '');
    setLink(req.meeting_link || '');
    setNotes(req.teacher_notes || '');
  };

  const handleRespond = async (status: 'accepted' | 'rejected' | 'completed') => {
    if (!selected) return;
    await respond.mutateAsync({
      id: selected.id,
      status,
      scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      meeting_link: link || null,
      teacher_notes: notes || null,
    });
    setOpenId(null);
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
            <CalendarCheck className="h-6 w-6" />
            Meeting Requests
          </h1>
          <p className="text-muted-foreground">
            Parents have requested these meetings — accept, reject, or mark complete.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as PtmStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="requested">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <TableHead>Topic</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.student?.profile?.full_name}
                      {r.student?.class && (
                        <div className="text-xs text-muted-foreground">
                          {r.student.class.name}-{r.student.class.section}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{r.topic}</TableCell>
                    <TableCell className="text-xs">
                      {r.preferred_date ? format(new Date(r.preferred_date), 'dd MMM') : '—'}
                      {r.preferred_slot ? ` · ${r.preferred_slot}` : ''}
                    </TableCell>
                    <TableCell>{r.meeting_mode}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(r.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Meeting Request</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/40 rounded p-3 space-y-1 text-sm">
                <p>
                  <strong>Student:</strong> {selected.student?.profile?.full_name}
                </p>
                <p>
                  <strong>Topic:</strong> {selected.topic}
                </p>
                {selected.parent_notes && (
                  <p>
                    <strong>Parent notes:</strong> {selected.parent_notes}
                  </p>
                )}
                {selected.preferred_date && (
                  <p>
                    <strong>Preferred:</strong>{' '}
                    {format(new Date(selected.preferred_date), 'dd MMM')}
                    {selected.preferred_slot ? ` · ${selected.preferred_slot}` : ''}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Scheduled At (confirm or reschedule)</Label>
                <Input
                  type="datetime-local"
                  value={scheduled}
                  onChange={(e) => setScheduled(e.target.value)}
                />
              </div>

              {selected.meeting_mode === 'video' && (
                <div className="space-y-1">
                  <Label>Video Meeting Link</Label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Your Notes</Label>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRespond('rejected')}
                  disabled={respond.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleRespond('accepted')}
                  disabled={respond.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleRespond('completed')}
                  disabled={respond.isPending}
                >
                  Mark Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
