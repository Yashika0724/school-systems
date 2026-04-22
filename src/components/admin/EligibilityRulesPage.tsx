import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import {
  useEligibilityRules,
  useUpsertEligibilityRule,
  useDeleteEligibilityRule,
} from '@/hooks/useEligibility';
import { useExamTypes } from '@/hooks/useExams';

const ALL = '__all__';

export function EligibilityRulesPage() {
  const { data: rules, isLoading } = useEligibilityRules();
  const { data: examTypes } = useExamTypes();
  const upsert = useUpsertEligibilityRule();
  const del = useDeleteEligibilityRule();

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    exam_type_id: ALL,
    class_id: ALL,
    min_attendance_pct: 75,
    require_fees_paid: false,
    notes: '',
  });

  const handleSave = async () => {
    await upsert.mutateAsync({
      exam_type_id: form.exam_type_id === ALL ? null : form.exam_type_id,
      class_id: form.class_id === ALL ? null : form.class_id,
      min_attendance_pct: form.min_attendance_pct,
      require_fees_paid: form.require_fees_paid,
      notes: form.notes || undefined,
    });
    setOpen(false);
    setForm({
      exam_type_id: ALL,
      class_id: ALL,
      min_attendance_pct: 75,
      require_fees_paid: false,
      notes: '',
    });
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
            <CheckCircle2 className="h-6 w-6" />
            Exam Eligibility Rules
          </h1>
          <p className="text-muted-foreground">
            Set minimum attendance and fee-clearance requirements per exam.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Eligibility Rule</DialogTitle>
              <DialogDescription>
                Leave exam type or class blank to apply school-wide.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Exam Type</Label>
                  <Select
                    value={form.exam_type_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, exam_type_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Exams</SelectItem>
                      {examTypes?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Class</Label>
                  <Select
                    value={form.class_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, class_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All Classes</SelectItem>
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
                <Label>Minimum Attendance %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.min_attendance_pct}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      min_attendance_pct: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium text-sm">Require Fees Paid</p>
                  <p className="text-xs text-muted-foreground">
                    Block exam entry if any fee invoice is unpaid.
                  </p>
                </div>
                <Switch
                  checked={form.require_fees_paid}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, require_fees_paid: v }))}
                />
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {!rules || rules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No eligibility rules yet. Add one to enforce attendance before exams.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Type</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Min Attendance</TableHead>
                  <TableHead>Fees Required</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.exam_type?.name || <Badge variant="outline">All</Badge>}</TableCell>
                    <TableCell>
                      {rule.class
                        ? `${rule.class.name} - ${rule.class.section}`
                        : <Badge variant="outline">All</Badge>}
                    </TableCell>
                    <TableCell>{rule.min_attendance_pct ?? 0}%</TableCell>
                    <TableCell>
                      {rule.require_fees_paid ? (
                        <Badge>Required</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
