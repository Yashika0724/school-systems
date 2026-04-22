import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, ListChecks, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useExams } from '@/hooks/useExams';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import {
  useOnlineExams,
  useUpsertOnlineExam,
  useDeleteOnlineExam,
  useOnlineExamQuestions,
  useAttachQuestions,
  useDetachQuestion,
} from '@/hooks/useOnlineExam';
import { useQuestionBanks, useBankQuestions } from '@/hooks/useQuestionBank';

export function OnlineExamBuilderPage() {
  const { data: exams } = useExams();
  const { data: teacherClasses } = useTeacherClasses();
  const { data: onlineExams } = useOnlineExams();
  const { data: banks } = useQuestionBanks();

  const teacherClassSubjects = useMemo(
    () =>
      new Set(
        (teacherClasses || []).map((c) => `${c.class_id}:${c.subject_id}`),
      ),
    [teacherClasses],
  );

  const eligibleExams = useMemo(
    () =>
      (exams || []).filter((e) =>
        teacherClassSubjects.has(`${e.class_id}:${e.subject_id}`),
      ),
    [exams, teacherClassSubjects],
  );

  const upsert = useUpsertOnlineExam();
  const deleteOnline = useDeleteOnlineExam();

  const [createOpen, setCreateOpen] = useState(false);
  const [examId, setExamId] = useState<string>('');
  const [duration, setDuration] = useState(60);
  const [shuffle, setShuffle] = useState(true);
  const [allowTab, setAllowTab] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [instructions, setInstructions] = useState('');

  const [selectedOnlineId, setSelectedOnlineId] = useState<string | null>(null);
  const { data: attachedQs } = useOnlineExamQuestions(selectedOnlineId);
  const attach = useAttachQuestions();
  const detach = useDetachQuestion();

  const [pickOpen, setPickOpen] = useState(false);
  const [pickBankId, setPickBankId] = useState<string>('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data: bankQs } = useBankQuestions(pickBankId || null);

  const handleCreate = async () => {
    if (!examId) {
      toast.error('Pick an exam first');
      return;
    }
    await upsert.mutateAsync({
      exam_id: examId,
      duration_minutes: duration,
      shuffle_questions: shuffle,
      allow_tab_switch: allowTab,
      attempts_allowed: attempts,
      show_results_immediately: showResults,
      opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      instructions: instructions || null,
    });
    setCreateOpen(false);
    setExamId('');
    setInstructions('');
    setOpensAt('');
    setClosesAt('');
  };

  const togglePicked = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAttach = async () => {
    if (!selectedOnlineId || picked.size === 0) {
      toast.error('Select at least one question');
      return;
    }
    await attach.mutateAsync({
      online_exam_id: selectedOnlineId,
      question_ids: Array.from(picked),
    });
    setPickOpen(false);
    setPicked(new Set());
    setPickBankId('');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Online Exam Builder
          </h1>
          <p className="text-muted-foreground">
            Convert a scheduled exam into an online MCQ test.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Online Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Online Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Exam *</Label>
                <Select value={examId} onValueChange={setExamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a scheduled exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleExams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.class?.name}-{e.class?.section} · {e.subject?.name} ·{' '}
                        {e.exam_type?.name} · {format(new Date(e.exam_date), 'dd MMM')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Attempts Allowed</Label>
                  <Input
                    type="number"
                    min={1}
                    value={attempts}
                    onChange={(e) => setAttempts(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Opens At</Label>
                  <Input
                    type="datetime-local"
                    value={opensAt}
                    onChange={(e) => setOpensAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Closes At</Label>
                  <Input
                    type="datetime-local"
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded border p-2">
                <Label className="text-sm">Shuffle questions</Label>
                <Switch checked={shuffle} onCheckedChange={setShuffle} />
              </div>
              <div className="flex items-center justify-between rounded border p-2">
                <Label className="text-sm">Allow tab-switching</Label>
                <Switch checked={allowTab} onCheckedChange={setAllowTab} />
              </div>
              <div className="flex items-center justify-between rounded border p-2">
                <Label className="text-sm">Show score immediately</Label>
                <Switch checked={showResults} onCheckedChange={setShowResults} />
              </div>

              <div className="space-y-1">
                <Label>Instructions</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                />
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={upsert.isPending}>
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Online Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[460px] overflow-auto">
            {!onlineExams || onlineExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              onlineExams.map((oe) => (
                <div
                  key={oe.id}
                  className={`p-2 rounded border cursor-pointer ${
                    selectedOnlineId === oe.id
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedOnlineId(oe.id)}
                >
                  <div className="flex justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {oe.exam?.subject?.name} · {oe.exam?.exam_type?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {oe.exam?.class?.name}-{oe.exam?.class?.section} · {oe.duration_minutes}m ·{' '}
                        {oe.attempts_allowed} attempt(s)
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOnline.mutate(oe.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Attached Questions
            </CardTitle>
            {selectedOnlineId && (
              <Dialog open={pickOpen} onOpenChange={setPickOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add from Bank
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Pick Questions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Select value={pickBankId} onValueChange={setPickBankId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {(bankQs || []).map((q) => (
                        <label
                          key={q.id}
                          className="flex items-start gap-2 p-2 rounded border hover:bg-muted/30 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={picked.has(q.id)}
                            onChange={() => togglePicked(q.id)}
                          />
                          <div className="flex-1">
                            <div className="flex gap-1 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {q.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {q.marks} mk
                              </Badge>
                            </div>
                            <p className="text-sm">{q.text}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleAttach}
                      disabled={attach.isPending || picked.size === 0}
                    >
                      {attach.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Attach {picked.size} Question(s)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedOnlineId ? (
              <p className="text-center py-8 text-muted-foreground">
                Pick an online exam on the left.
              </p>
            ) : !attachedQs || attachedQs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No questions yet. Click "Add from Bank".
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-auto">
                {attachedQs.map((aq, i) => (
                  <div key={aq.id} className="p-3 rounded border">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">Q{i + 1}</span>
                          <Badge variant="outline">{aq.question?.type}</Badge>
                          <Badge variant="outline">
                            {aq.marks_override || aq.question?.marks} mk
                          </Badge>
                        </div>
                        <p className="text-sm">{aq.question?.text}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          detach.mutate({
                            id: aq.id,
                            online_exam_id: selectedOnlineId!,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
