import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';
import type {
  Difficulty,
  BloomLevel,
  QuestionOption,
} from '@/hooks/useQuestionBank';

interface AiQuestion {
  text: string;
  type: 'mcq' | 'true_false';
  options?: QuestionOption[];
  correct_answer: string;
  marks: number;
  explanation: string;
  topic: string;
  difficulty: string;
  bloom_level: string;
}

interface Props {
  bankId: string;
  subjectName?: string;
  onSaved?: () => void;
}

const db = supabase as unknown as { from: (table: string) => any };

export function AiQuestionGeneratorDialog({ bankId, subjectName, onSaved }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [type, setType] = useState<'mcq' | 'true_false'>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [bloom, setBloom] = useState<BloomLevel>('understand');
  const [marks, setMarks] = useState(1);

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<AiQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }
    setGenerating(true);
    setGenerated([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-generator', {
        body: {
          topic: topic.trim(),
          subject_name: subjectName,
          count,
          difficulty,
          bloom_level: bloom,
          type,
          marks_per_question: marks,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const qs = (data as { questions?: AiQuestion[] })?.questions || [];
      if (qs.length === 0) {
        toast.error('AI returned no questions');
        return;
      }
      setGenerated(qs);
      setSelected(new Set(qs.map((_, i) => i)));
      toast.success(`Generated ${qs.length} question(s)`);
    } catch (e: any) {
      toast.error('Generation failed: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleSave = async () => {
    const rows = Array.from(selected)
      .sort()
      .map((i) => generated[i])
      .filter(Boolean);
    if (rows.length === 0) {
      toast.error('Select at least one question');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = rows.map((q) => ({
        bank_id: bankId,
        type: q.type,
        text: q.text,
        options: q.type === 'mcq' ? q.options : null,
        correct_answer: q.correct_answer,
        marks: q.marks,
        difficulty: q.difficulty,
        bloom_level: q.bloom_level,
        topic: q.topic,
        explanation: q.explanation,
        created_by: userData.user?.id || null,
      }));
      const { error } = await db.from('questions').insert(payload);
      if (error) throw error;
      toast.success(`Saved ${payload.length} question(s)`);
      qc.invalidateQueries({ queryKey: ['questions', bankId] });
      setOpen(false);
      setGenerated([]);
      setSelected(new Set());
      setTopic('');
      onSaved?.();
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-purple-300 text-purple-700">
          <Sparkles className="h-4 w-4 mr-1" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Describe the topic and preferences, then review and save the questions you like.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Topic *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Quadratic equations, French Revolution"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
              />
            </div>
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
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
              <Label>Bloom</Label>
              <Select value={bloom} onValueChange={(v) => setBloom(v as BloomLevel)}>
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
            <div className="space-y-1">
              <Label>Marks each</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>

          {generated.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selected.size} of {generated.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelected(new Set(generated.map((_, i) => i)))
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-auto border rounded p-2">
                {generated.map((q, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggle(i)}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1 mb-1">
                        <Badge variant="outline">{q.type}</Badge>
                        <Badge variant="outline">{q.difficulty}</Badge>
                        <Badge variant="outline">{q.bloom_level}</Badge>
                        <Badge variant="outline">{q.marks} mk</Badge>
                      </div>
                      <p className="text-sm font-medium">{q.text}</p>
                      {q.options && (
                        <ul className="text-xs mt-1 ml-4 space-y-0.5">
                          {q.options.map((o) => (
                            <li
                              key={o.key}
                              className={
                                o.key === q.correct_answer
                                  ? 'text-green-600 font-medium'
                                  : 'text-muted-foreground'
                              }
                            >
                              {o.key}. {o.text}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.type === 'true_false' && (
                        <p className="text-xs mt-1 text-green-600">
                          Correct: {q.correct_answer}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-xs mt-1 text-muted-foreground italic">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving || selected.size === 0}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save to Bank
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
