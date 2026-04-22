import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarClock, Plus, Video, Phone, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { usePtmRequests, useCreatePtm, useCancelPtm, type PtmStatus, type MeetingMode } from '@/hooks/usePtm';
import { toast } from 'sonner';

const statusBadge = (s: PtmStatus) => {
  if (s === 'requested') return <Badge variant="secondary">Requested</Badge>;
  if (s === 'accepted') return <Badge className="bg-green-100 text-green-700 border-green-300">Accepted</Badge>;
  if (s === 'completed') return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Completed</Badge>;
  if (s === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
};

const db = supabase as unknown as { from: (table: string) => any };

export function ParentMeetingRequestPage() {
  const { data: parent } = useParentData();
  const { data: children } = useLinkedChildren(parent?.id);
  const { data: requests, isLoading } = usePtmRequests();
  const create = useCreatePtm();
  const cancel = useCancelPtm();

  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState<string>('__none');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState<MeetingMode>('in_person');
  const [notes, setNotes] = useState('');

  const selectedChild = useMemo(
    () => children?.find((c) => c.student_id === childId),
    [children, childId],
  );

  const { data: classTeachers } = useQuery({
    queryKey: ['class-teachers', selectedChild?.student.class?.id],
    queryFn: async () => {
      const classId = (selectedChild?.student as any)?.class_id;
      if (!classId) return [];
      const { data, error } = await db
        .from('teacher_classes')
        .select(`
          teacher_id,
          subject_id,
          is_class_teacher,
          teacher:teachers(
            id,
            profile:profiles!teachers_user_id_fkey(full_name)
          ),
          subject:subjects(id, name)
        `)
        .eq('class_id', classId);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        teacher: Array.isArray(r.teacher) ? r.teacher[0] : r.teacher,
        subject: Array.isArray(r.subject) ? r.subject[0] : r.subject,
      }));
    },
    enabled: !!selectedChild,
  });

  const handleSubmit = async () => {
    if (!parent || !selectedChild || !teacherId || !topic.trim()) {
      toast.error('Pick child, teacher, and topic');
      return;
    }
    await create.mutateAsync({
      parent_id: parent.id,
      teacher_id: teacherId,
      student_id: selectedChild.student_id,
      subject_id: subjectId === '__none' ? null : subjectId,
      topic: topic.trim(),
      preferred_date: date || null,
      preferred_slot: slot || null,
      meeting_mode: mode,
      parent_notes: notes || null,
    });
    setOpen(false);
    setTopic('');
    setDate('');
    setSlot('');
    setNotes('');
    setSubjectId('__none');
    setTeacherId('');
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
            <CalendarClock className="h-6 w-6" />
            Parent-Teacher Meetings
          </h1>
          <p className="text-muted-foreground">
            Request a meeting with your child's teacher.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Child *</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children?.map((c) => (
                      <SelectItem key={c.student_id} value={c.student_id}>
                        {c.student.profile?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedChild && (
                <>
                  <div className="space-y-1">
                    <Label>Teacher *</Label>
                    <Select value={teacherId} onValueChange={setTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {(classTeachers || []).map((tc: any) => (
                          <SelectItem key={tc.teacher_id} value={tc.teacher_id}>
                            {tc.teacher?.profile?.full_name}
                            {tc.subject?.name ? ` — ${tc.subject.name}` : ''}
                            {tc.is_class_teacher ? ' (Class Teacher)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">General</SelectItem>
                        {(classTeachers || [])
                          .filter((tc: any) => tc.subject)
                          .map((tc: any) => (
                            <SelectItem key={tc.subject.id} value={tc.subject.id}>
                              {tc.subject.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label>Topic *</Label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Maths performance in last exam"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Preferred Slot</Label>
                  <Input
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    placeholder="e.g., 3-4 PM"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as MeetingMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="video">Video call</SelectItem>
                    <SelectItem value="phone">Phone call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything specific you'd like to discuss?"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={create.isPending || !topic.trim() || !teacherId}
              >
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No meeting requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.student?.profile?.full_name}</TableCell>
                    <TableCell>{r.teacher?.profile?.full_name}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.topic}</TableCell>
                    <TableCell className="text-xs">
                      {r.preferred_date ? format(new Date(r.preferred_date), 'dd MMM') : '—'}
                      {r.preferred_slot ? ` · ${r.preferred_slot}` : ''}
                    </TableCell>
                    <TableCell>
                      {r.meeting_mode === 'video' ? (
                        <Video className="h-4 w-4" />
                      ) : r.meeting_mode === 'phone' ? (
                        <Phone className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      {['requested', 'accepted'].includes(r.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancel.mutate(r.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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
