import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Award, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  useGradingScales,
  useCreateGradingBand,
  useDeleteGradingBand,
  type GradingBand,
} from '@/hooks/useGradingScales';

export function GradingScalesPage() {
  const { data: bands, isLoading } = useGradingScales();
  const createBand = useCreateGradingBand();
  const deleteBand = useDeleteGradingBand();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: 'Default',
    letter: '',
    min_pct: 0,
    max_pct: 0,
    grade_point: 0,
    description: '',
    is_default: true,
  });

  const resetForm = () =>
    setForm({
      name: 'Default',
      letter: '',
      min_pct: 0,
      max_pct: 0,
      grade_point: 0,
      description: '',
      is_default: true,
    });

  const handleCreate = async () => {
    if (!form.letter.trim()) return;
    await createBand.mutateAsync({
      name: form.name,
      letter: form.letter,
      min_pct: form.min_pct,
      max_pct: form.max_pct,
      grade_point: form.grade_point,
      description: form.description || null,
      is_default: form.is_default,
    });
    setOpen(false);
    resetForm();
  };

  const grouped: Record<string, GradingBand[]> = {};
  (bands || []).forEach((b) => {
    grouped[b.name] = grouped[b.name] || [];
    grouped[b.name].push(b);
  });

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
            <Award className="h-6 w-6" />
            Grading Scales
          </h1>
          <p className="text-muted-foreground">
            Configure how percentages map to letter grades and GPA points.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Band
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Grading Band</DialogTitle>
              <DialogDescription>
                Define a percentage range and its letter grade.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Scale Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Default"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Letter *</Label>
                  <Input
                    value={form.letter}
                    onChange={(e) => setForm((p) => ({ ...p, letter: e.target.value }))}
                    placeholder="A+"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Min %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.min_pct}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, min_pct: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Max %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.max_pct}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, max_pct: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Grade Point</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.grade_point}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, grade_point: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g., Excellent"
                />
              </div>

              <div className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium text-sm">Default Scale</p>
                  <p className="text-xs text-muted-foreground">
                    Mark this band as part of the school's default scale.
                  </p>
                </div>
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_default: v }))}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createBand.isPending || !form.letter.trim()}
              >
                {createBand.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Band
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No grading bands defined yet.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([name, rows]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {name}
                {rows.some((r) => r.is_default) && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Letter</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Grade Point</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows
                    .slice()
                    .sort((a, b) => b.min_pct - a.min_pct)
                    .map((band) => (
                      <TableRow key={band.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-bold">
                            {band.letter}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {band.min_pct}% – {band.max_pct}%
                        </TableCell>
                        <TableCell>{band.grade_point ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {band.description || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBand.mutate(band.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
