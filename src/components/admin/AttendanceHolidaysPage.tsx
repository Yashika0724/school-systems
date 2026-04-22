import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  Edit2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useHolidays,
  useUpsertHoliday,
  useDeleteHoliday,
  type Holiday,
} from '@/hooks/useAttendanceSettings';

interface FormState {
  id?: string;
  date: Date | null;
  name: string;
  description: string;
}

const emptyForm: FormState = { date: null, name: '', description: '' };

export function AttendanceHolidaysPage() {
  const { data: holidays, isLoading } = useHolidays();
  const upsert = useUpsertHoliday();
  const del = useDeleteHoliday();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setForm({
      id: h.id,
      date: new Date(h.date + 'T00:00:00'),
      name: h.name,
      description: h.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.date || !form.name.trim()) return;
    upsert.mutate(
      {
        id: form.id,
        date: format(form.date, 'yyyy-MM-dd'),
        name: form.name.trim(),
        description: form.description.trim() || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm(emptyForm);
        },
      },
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Holiday Calendar
          </h1>
          <p className="text-muted-foreground">
            Holidays are excluded from attendance percentage calculations across all roles.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Holidays ({holidays?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !holidays || holidays.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No holidays added yet. Click "Add Holiday" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(h.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {h.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {h.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(h)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(h)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mt-1 justify-start">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {form.date ? format(form.date, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.date ?? undefined}
                    onSelect={(d) => setForm((f) => ({ ...f, date: d ?? null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diwali"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="holiday-desc">Description (optional)</Label>
              <Textarea
                id="holiday-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.date || !form.name.trim() || upsert.isPending}
            >
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleteTarget?.name}" on{' '}
              {deleteTarget &&
                format(new Date(deleteTarget.date + 'T00:00:00'), 'PPP')}
              . Attendance percentages will recount to include that day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) del.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
