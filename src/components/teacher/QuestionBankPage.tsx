import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Library, Brain } from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuestionBanks,
  useCreateBank,
  useDeleteBank,
  useBankQuestions,
  useCreateQuestion,
  useDeleteQuestion,
  type QuestionType,
  type Difficulty,
  type BloomLevel,
  type QuestionOption,
} from '@/hooks/useQuestionBank';
import { AiQuestionGeneratorDialog } from './AiQuestionGeneratorDialog';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export function QuestionBankPage() {
  const { data: banks, isLoading: banksLoading } = useQuestionBanks();
  const createBank = useCreateBank();
  const deleteBank = useDeleteBank();

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*').order('name');
      return data || [];
    },
  });
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  const [bankOpen, setBankOpen] = useState(false);
  const [newBank, setNewBank] = useState<{
    name: string;
    subject_id?: string | null;
    class_id?: string | null;
    description: string;
  }>({ name: '', subject_id: null, class_id: null, description: '' });

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState(1);
  const [qDifficulty, setQDifficulty] = useState<Difficulty>('medium');
  const [qBloom, setQBloom] = useState<BloomLevel>('understand');
  const [qTopic, setQTopic] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<QuestionOption[]>(
    OPTION_KEYS.map((k) => ({ key: k, text: '' })),
  );
  const [qCorrect, setQCorrect] = useState<string>('A');
  const [qTrueFalse, setQTrueFalse] = useState<'true' | 'false'>('true');

  const { data: questions, isLoading: questionsLoading } = useBankQuestions(selectedBankId);
  const createQuestion = useCreateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const handleCreateBank = async () => {
    if (!newBank.name.trim()) return;
    await createBank.mutateAsync(newBank);
    setBankOpen(false);
    setNewBank({ name: '', subject_id: null, class_id: null, description: '' });
  };

  const resetQuestionForm = () => {
    setQType('mcq');
    setQText('');
    setQMarks(1);
    setQTopic('');
    setQExplanation('');
    setQOptions(OPTION_KEYS.map((k) => ({ key: k, text: '' })));
    setQCorrect('A');
    setQTrueFalse('true');
  };

  const handleCreateQuestion = async () => {
    if (!selectedBankId) return;
    if (!qText.trim()) {
      toast.error('Question text required');
      return;
    }

    let correct_answer: unknown = null;
    let options: QuestionOption[] | undefined = undefined;

    if (qType === 'mcq') {
      options = qOptions.filter((o) => o.text.trim() !== '');
      if (options.length < 2) {
        toast.error('Add at least 2 options');
        return;
      }
      if (!options.some((o) => o.key === qCorrect)) {
        toast.error('Select a valid correct option');
        return;
      }
      correct_answer = qCorrect;
    } else if (qType === 'true_false') {
      correct_answer = qTrueFalse;
    } else {
      correct_answer = qText.toLowerCase();
    }

    await createQuestion.mutateAsync({
      bank_id: selectedBankId,
      type: qType,
      text: qText.trim(),
      options,
      correct_answer,
      marks: qMarks,
      difficulty: qDifficulty,
      bloom_level: qBloom,
      topic: qTopic.trim() || undefined,
      explanation: qExplanation.trim() || undefined,
    });
    setQuestionOpen(false);
    resetQuestionForm();
  };

  if (banksLoading) {
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
            <Library className="h-6 w-6" />
            Question Bank
          </h1>
          <p className="text-muted-foreground">
            Create question banks and stockpile MCQs for your online exams.
          </p>
        </div>

        <Dialog open={bankOpen} onOpenChange={setBankOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Bank
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Question Bank</DialogTitle>
              <DialogDescription>
                Group questions by subject + class so you can reuse them across exams.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input
                  value={newBank.name}
                  onChange={(e) => setNewBank((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Class 9 Algebra"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Subject</Label>
                  <Select
                    value={newBank.subject_id || ''}
                    onValueChange={(v) =>
                      setNewBank((p) => ({ ...p, subject_id: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="(any)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Class</Label>
                  <Select
                    value={newBank.class_id || ''}
                    onValueChange={(v) =>
                      setNewBank((p) => ({ ...p, class_id: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="(any)" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - {c.section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={newBank.description}
                  onChange={(e) =>
                    setNewBank((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateBank}
                disabled={createBank.isPending}
              >
                {createBank.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Bank
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Your Banks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-auto">
            {(banks || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No banks yet.</p>
            )}
            {(banks || []).map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                  selectedBankId === b.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted/40'
                }`}
                onClick={() => setSelectedBankId(b.id)}
              >
                <div>
                  <p className="font-medium text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.subject?.name || 'Any subject'}
                    {b.class ? ` · ${b.class.name}-${b.class.section}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBank.mutate(b.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Questions</CardTitle>
            {selectedBankId && (
              <div className="flex gap-2">
                <AiQuestionGeneratorDialog
                  bankId={selectedBankId}
                  subjectName={
                    banks?.find((b) => b.id === selectedBankId)?.subject?.name
                  }
                />
                <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Question</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label>Type</Label>
                        <Select
                          value={qType}
                          onValueChange={(v) => setQType(v as QuestionType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">MCQ (single)</SelectItem>
                            <SelectItem value="true_false">True / False</SelectItem>
                            <SelectItem value="short">Short answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Difficulty</Label>
                        <Select
                          value={qDifficulty}
                          onValueChange={(v) => setQDifficulty(v as Difficulty)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Bloom Level</Label>
                        <Select
                          value={qBloom}
                          onValueChange={(v) => setQBloom(v as BloomLevel)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="remember">Remember</SelectItem>
                            <SelectItem value="understand">Understand</SelectItem>
                            <SelectItem value="apply">Apply</SelectItem>
                            <SelectItem value="analyze">Analyze</SelectItem>
                            <SelectItem value="evaluate">Evaluate</SelectItem>
                            <SelectItem value="create">Create</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Question Text *</Label>
                      <Textarea
                        value={qText}
                        onChange={(e) => setQText(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {qType === 'mcq' && (
                      <div className="space-y-2">
                        <Label>Options (mark the correct one)</Label>
                        {qOptions.map((opt, i) => (
                          <div key={opt.key} className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={qCorrect === opt.key}
                              onChange={() => setQCorrect(opt.key)}
                            />
                            <span className="font-semibold w-4">{opt.key}.</span>
                            <Input
                              value={opt.text}
                              onChange={(e) => {
                                const next = [...qOptions];
                                next[i] = { ...opt, text: e.target.value };
                                setQOptions(next);
                              }}
                              placeholder={`Option ${opt.key}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {qType === 'true_false' && (
                      <div className="space-y-1">
                        <Label>Correct Answer</Label>
                        <Select
                          value={qTrueFalse}
                          onValueChange={(v) => setQTrueFalse(v as 'true' | 'false')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {qType === 'short' && (
                      <p className="text-sm text-muted-foreground">
                        Short answer auto-grading is limited — score is set to 0 by default; teachers can adjust later.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Marks</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={qMarks}
                          onChange={(e) => setQMarks(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Topic</Label>
                        <Input
                          value={qTopic}
                          onChange={(e) => setQTopic(e.target.value)}
                          placeholder="e.g., Quadratic Equations"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Explanation (shown after submit)</Label>
                      <Textarea
                        value={qExplanation}
                        onChange={(e) => setQExplanation(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleCreateQuestion}
                      disabled={createQuestion.isPending}
                    >
                      {createQuestion.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Question
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedBankId ? (
              <p className="text-center py-8 text-muted-foreground">
                Select a bank on the left to see its questions.
              </p>
            ) : questionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !questions || questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-40" />
                No questions in this bank yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-auto">
                {questions.map((q) => (
                  <div key={q.id} className="p-3 rounded border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline">{q.type}</Badge>
                          {q.difficulty && <Badge variant="secondary">{q.difficulty}</Badge>}
                          {q.bloom_level && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                              {q.bloom_level}
                            </Badge>
                          )}
                          <Badge variant="outline">{q.marks} mk</Badge>
                          {q.topic && (
                            <span className="text-xs text-muted-foreground">· {q.topic}</span>
                          )}
                        </div>
                        <p className="text-sm">{q.text}</p>
                        {q.options && q.options.length > 0 && (
                          <ul className="mt-2 ml-4 space-y-0.5 text-xs">
                            {q.options.map((o) => (
                              <li
                                key={o.key}
                                className={
                                  String(q.correct_answer) === o.key
                                    ? 'text-green-600 font-medium'
                                    : 'text-muted-foreground'
                                }
                              >
                                {o.key}. {o.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deleteQuestion.mutate({ id: q.id, bank_id: selectedBankId! })
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
