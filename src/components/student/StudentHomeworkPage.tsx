import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isPast, isToday } from 'date-fns';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  Award,
  Paperclip,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMyHomeworkSubmissionsByIds,
  useSubmitHomework,
  getHomeworkFileSignedUrl,
  type HomeworkSubmission,
} from '@/hooks/useHomework';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  attachment_url: string | null;
  subject: { name: string };
}

export function StudentHomeworkPage() {
  const { user } = useAuth();

  const { data: studentData } = useQuery({
    queryKey: ['student-record', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('students')
        .select('id, class_id')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  const { data: homework, isLoading } = useQuery({
    queryKey: ['student-homework', studentData?.class_id],
    queryFn: async (): Promise<Homework[]> => {
      if (!studentData?.class_id) return [];

      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          due_date,
          assigned_date,
          attachment_url,
          subject:subjects(name)
        `)
        .eq('class_id', studentData.class_id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching homework:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as Homework[];
    },
    enabled: !!studentData?.class_id,
  });

  const homeworkIds = useMemo(() => (homework || []).map(h => h.id), [homework]);
  const { data: submissions } = useMyHomeworkSubmissionsByIds(homeworkIds);
  const submissionMap = useMemo(() => {
    const m = new Map<string, HomeworkSubmission>();
    for (const s of submissions || []) m.set(s.homework_id, s);
    return m;
  }, [submissions]);

  const [activeHw, setActiveHw] = useState<Homework | null>(null);

  const getDueStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle };
    }
    if (isToday(due)) {
      return { label: 'Due Today', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: Clock };
    }
    return { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Calendar };
  };

  const categorize = (hw: Homework) => {
    const sub = submissionMap.get(hw.id);
    if (sub?.status === 'graded') return 'graded';
    if (sub?.status === 'submitted') return 'submitted';
    if (isPast(new Date(hw.due_date)) && !isToday(new Date(hw.due_date))) return 'past';
    return 'pending';
  };

  const pendingHomework = (homework || []).filter(h => categorize(h) === 'pending');
  const submittedHomework = (homework || []).filter(h => categorize(h) === 'submitted');
  const gradedHomework = (homework || []).filter(h => categorize(h) === 'graded');
  const pastHomework = (homework || []).filter(h => categorize(h) === 'past');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const HomeworkCard = ({ hw }: { hw: Homework }) => {
    const status = getDueStatus(hw.due_date);
    const StatusIcon = status.icon;
    const submission = submissionMap.get(hw.id);

    const handleOpenAttachment = async () => {
      if (!hw.attachment_url) return;
      const url = await getHomeworkFileSignedUrl(hw.attachment_url);
      if (url) window.open(url, '_blank');
      else toast.error('Could not open attachment');
    };

    const handleOpenSubmissionFile = async () => {
      if (!submission?.attachment_url) return;
      const url = await getHomeworkFileSignedUrl(submission.attachment_url);
      if (url) window.open(url, '_blank');
      else toast.error('Could not open submission file');
    };

    return (
      <Card key={hw.id}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold">{hw.title}</h3>
                  <p className="text-sm text-muted-foreground">{hw.subject?.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {submission?.status === 'graded' && (
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <Award className="h-3 w-3 mr-1" />
                      Grade: {submission.grade || '—'}
                    </Badge>
                  )}
                  {submission?.status === 'submitted' && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                  {!submission && (
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  )}
                </div>
              </div>

              {hw.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {hw.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Assigned: {format(new Date(hw.assigned_date), 'PP')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {format(new Date(hw.due_date), 'PP')}
                </span>
                {hw.attachment_url && (
                  <button onClick={handleOpenAttachment} className="flex items-center gap-1 text-primary hover:underline">
                    <Paperclip className="h-3 w-3" />
                    Attachment
                  </button>
                )}
              </div>

              {submission?.feedback && (
                <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-medium mb-1">Teacher feedback</p>
                  <p className="text-muted-foreground">{submission.feedback}</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {submission ? (
                  <>
                    {submission.status !== 'graded' && (
                      <Button size="sm" variant="outline" onClick={() => setActiveHw(hw)}>
                        <Upload className="h-3 w-3 mr-1" />
                        Update submission
                      </Button>
                    )}
                    {submission.attachment_url && (
                      <Button size="sm" variant="ghost" onClick={handleOpenSubmissionFile}>
                        <FileText className="h-3 w-3 mr-1" />
                        View my file
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" onClick={() => setActiveHw(hw)}>
                    <Upload className="h-3 w-3 mr-1" />
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Homework</h1>
        <p className="text-muted-foreground">View, submit, and track your assignments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-800">{pendingHomework.length}</p>
              <p className="text-xs text-blue-700">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold text-emerald-800">{submittedHomework.length}</p>
              <p className="text-xs text-emerald-700">Submitted</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-800">{gradedHomework.length}</p>
              <p className="text-xs text-green-700">Graded</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-orange-800">
                {(homework || []).filter(h => isToday(new Date(h.due_date))).length}
              </p>
              <p className="text-xs text-orange-700">Due Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {homework && homework.length > 0 ? (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingHomework.length})</TabsTrigger>
            <TabsTrigger value="submitted">Submitted ({submittedHomework.length})</TabsTrigger>
            <TabsTrigger value="graded">Graded ({gradedHomework.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastHomework.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingHomework.length > 0 ? (
              pendingHomework.map(hw => <HomeworkCard key={hw.id} hw={hw} />)
            ) : (
              <EmptyCard icon={<CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />} title="All Caught Up!" text="You have no pending homework." />
            )}
          </TabsContent>

          <TabsContent value="submitted" className="space-y-4">
            {submittedHomework.length > 0 ? submittedHomework.map(hw => <HomeworkCard key={hw.id} hw={hw} />) : <EmptyCard title="Nothing submitted yet" />}
          </TabsContent>

          <TabsContent value="graded" className="space-y-4">
            {gradedHomework.length > 0 ? gradedHomework.map(hw => <HomeworkCard key={hw.id} hw={hw} />) : <EmptyCard title="No graded homework yet" />}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastHomework.length > 0 ? pastHomework.map(hw => <HomeworkCard key={hw.id} hw={hw} />) : <EmptyCard title="No past homework to show." />}
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyCard
          icon={<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
          title="No Homework Assigned"
          text="You don't have any homework assigned yet."
        />
      )}

      <SubmitDialog
        homework={activeHw}
        existingSubmission={activeHw ? submissionMap.get(activeHw.id) ?? null : null}
        onClose={() => setActiveHw(null)}
      />
    </div>
  );
}

function EmptyCard({ icon, title, text }: { icon?: React.ReactNode; title: string; text?: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        {icon}
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        {text && <p className="text-muted-foreground">{text}</p>}
      </CardContent>
    </Card>
  );
}

function SubmitDialog({
  homework,
  existingSubmission,
  onClose,
}: {
  homework: Homework | null;
  existingSubmission: HomeworkSubmission | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(existingSubmission?.submission_text ?? '');
  const [file, setFile] = useState<File | null>(null);
  const submit = useSubmitHomework();

  const isOpen = !!homework;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setText('');
      setFile(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!homework) return;
    if (!text.trim() && !file && !existingSubmission?.attachment_url) {
      toast.error('Add a note or attach a file');
      return;
    }
    try {
      await submit.mutateAsync({
        homework_id: homework.id,
        submission_text: text,
        file,
        existingSubmissionId: existingSubmission?.id ?? null,
        existingAttachmentUrl: existingSubmission?.attachment_url ?? null,
      });
      toast.success(existingSubmission ? 'Submission updated' : 'Submitted!');
      setText('');
      setFile(null);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingSubmission ? 'Update submission' : 'Submit homework'}</DialogTitle>
          {homework && (
            <DialogDescription>
              {homework.title} — {homework.subject?.name}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write your answer or notes here..."
            />
          </div>

          <div className="space-y-2">
            <Label>Attachment (optional)</Label>
            <Input
              type="file"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
            />
            {existingSubmission?.attachment_url && !file && (
              <p className="text-xs text-muted-foreground">
                A file is already attached. Upload a new one to replace it.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : existingSubmission ? (
                'Update'
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
