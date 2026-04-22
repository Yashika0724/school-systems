import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus,
  BookOpen,
  Calendar,
  Loader2,
  AlertCircle,
  Eye,
  Trash2,
  Pencil,
  Paperclip,
  CheckCircle2,
  ClipboardList,
  Award,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, type TeacherClass } from '@/hooks/useTeacherClasses';
import {
  useHomeworkSubmissions,
  useClassRoster,
  useGradeHomeworkSubmission,
  useUpdateHomework,
  useUploadTeacherHomeworkFile,
  getHomeworkFileSignedUrl,
  type HomeworkSubmission,
  type ClassRosterStudent,
} from '@/hooks/useHomework';
import { cn } from '@/lib/utils';

interface HomeworkRow {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  class_id: string;
  subject_id: string;
  attachment_url: string | null;
  class: { name: string; section: string };
  subject: { name: string };
}

export function HomeworkPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teacherClasses, isLoading: classesLoading } = useTeacherClasses();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingHw, setViewingHw] = useState<HomeworkRow | null>(null);
  const [editingHw, setEditingHw] = useState<HomeworkRow | null>(null);

  const uploadFile = useUploadTeacherHomeworkFile();

  const { data: homeworkList, isLoading: homeworkLoading } = useQuery({
    queryKey: ['teacher-homework', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          due_date,
          assigned_date,
          class_id,
          subject_id,
          attachment_url,
          class:classes(name, section),
          subject:subjects(name)
        `)
        .eq('assigned_by', user.id)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('Error fetching homework:', error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        class: Array.isArray(item.class) ? item.class[0] : item.class,
        subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      })) as HomeworkRow[];
    },
    enabled: !!user,
  });

  const homeworkIds = useMemo(() => (homeworkList || []).map(h => h.id), [homeworkList]);

  const { data: submissionCounts } = useQuery({
    queryKey: ['teacher-homework-submission-counts', homeworkIds.slice().sort().join(',')],
    queryFn: async () => {
      if (homeworkIds.length === 0) return {} as Record<string, { submitted: number; graded: number }>;
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('homework_id, status')
        .in('homework_id', homeworkIds);
      if (error) throw error;
      const map: Record<string, { submitted: number; graded: number }> = {};
      for (const row of data || []) {
        const entry = map[row.homework_id] || { submitted: 0, graded: 0 };
        if (row.status === 'submitted') entry.submitted += 1;
        if (row.status === 'graded') entry.graded += 1;
        map[row.homework_id] = entry;
      }
      return map;
    },
    enabled: homeworkIds.length > 0,
  });

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setSelectedClass(null);
    setAttachment(null);
  };

  const handleCreate = async () => {
    if (!selectedClass || !title || !dueDate || !user) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: created, error } = await supabase
        .from('homework')
        .insert({
          title,
          description: description || null,
          subject_id: selectedClass.subject_id,
          class_id: selectedClass.class_id,
          assigned_by: user.id,
          due_date: format(dueDate, 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;

      if (attachment && created) {
        const path = await uploadFile.mutateAsync({ homework_id: created.id, file: attachment });
        const { error: updateError } = await supabase
          .from('homework')
          .update({ attachment_url: path })
          .eq('id', created.id);
        if (updateError) throw updateError;
      }

      toast.success('Homework assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      resetCreateForm();
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error('Error creating homework:', error);
      toast.error(error.message || 'Failed to assign homework');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (homeworkId: string) => {
    if (!confirm('Are you sure you want to delete this homework?')) return;

    try {
      const { error } = await supabase.from('homework').delete().eq('id', homeworkId);
      if (error) throw error;
      toast.success('Homework deleted');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
    } catch (error: any) {
      console.error('Error deleting homework:', error);
      toast.error('Failed to delete homework');
    }
  };

  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due < today) return { label: 'Past Due', color: 'bg-red-100 text-red-700' };
    if (due.getTime() === today.getTime()) return { label: 'Due Today', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Upcoming', color: 'bg-green-100 text-green-700' };
  };

  const openAttachment = async (path: string | null | undefined) => {
    const url = await getHomeworkFileSignedUrl(path);
    if (url) window.open(url, '_blank');
    else toast.error('Could not open attachment');
  };

  if (classesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Homework</h1>
          <p className="text-muted-foreground">Assign, review, and grade homework for your classes</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetCreateForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Assign Homework
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign New Homework</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Class & Subject *</Label>
                <Select
                  value={selectedClass ? `${selectedClass.class_id}|${selectedClass.subject_id}` : ''}
                  onValueChange={(key) => {
                    const [classId, subjectId] = key.split('|');
                    const cls = teacherClasses?.find(c => c.class_id === classId && c.subject_id === subjectId);
                    setSelectedClass(cls || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses?.map((cls) => (
                      <SelectItem key={`${cls.class_id}-${cls.subject_id}`} value={`${cls.class_id}|${cls.subject_id}`}>
                        {cls.class?.name} - {cls.class?.section} ({cls.subject?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 5 Exercises" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed instructions..." rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} disabled={(date) => date < new Date()} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Attachment (optional)</Label>
                <Input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</>) : 'Assign Homework'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {homeworkLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : homeworkList && homeworkList.length > 0 ? (
        <div className="grid gap-4">
          {homeworkList.map((hw) => {
            const status = getDueDateStatus(hw.due_date);
            const counts = submissionCounts?.[hw.id] || { submitted: 0, graded: 0 };
            const totalSubs = counts.submitted + counts.graded;
            return (
              <Card key={hw.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{hw.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {hw.class?.name} - {hw.class?.section} • {hw.subject?.name}
                        </p>
                        {hw.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{hw.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-xs text-muted-foreground">Due: {format(new Date(hw.due_date), 'PPP')}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" />
                            {totalSubs} submission{totalSubs === 1 ? '' : 's'} · {counts.graded} graded
                          </span>
                          {hw.attachment_url && (
                            <button
                              onClick={() => openAttachment(hw.attachment_url)}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Paperclip className="h-3 w-3" /> Attachment
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-col">
                      <Button variant="outline" size="sm" onClick={() => setViewingHw(hw)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingHw(hw)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(hw.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Homework Assigned</h3>
            <p className="text-muted-foreground mb-4">You haven't assigned any homework yet. Click the button above to get started.</p>
          </CardContent>
        </Card>
      )}

      {teacherClasses && teacherClasses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">You don't have any classes assigned yet. Please contact the administrator.</p>
          </CardContent>
        </Card>
      )}

      <SubmissionsSheet homework={viewingHw} onClose={() => setViewingHw(null)} />
      <EditHomeworkDialog homework={editingHw} onClose={() => setEditingHw(null)} />
    </div>
  );
}

function SubmissionsSheet({ homework, onClose }: { homework: HomeworkRow | null; onClose: () => void }) {
  const isOpen = !!homework;
  const { data: submissions, isLoading: subsLoading } = useHomeworkSubmissions(homework?.id);
  const { data: roster, isLoading: rosterLoading } = useClassRoster(homework?.class_id);

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const gradeMutation = useGradeHomeworkSubmission();

  useEffect(() => {
    if (!isOpen) {
      setGradingId(null);
      setGrade('');
      setFeedback('');
    }
  }, [isOpen]);

  const submittedMap = useMemo(() => {
    const m = new Map<string, HomeworkSubmission>();
    for (const s of submissions || []) m.set(s.student_id, s);
    return m;
  }, [submissions]);

  const notSubmitted = (roster || []).filter(s => !submittedMap.has(s.id));

  const openFile = async (path: string | null) => {
    if (!path) return;
    const url = await getHomeworkFileSignedUrl(path);
    if (url) window.open(url, '_blank');
    else toast.error('Could not open file');
  };

  const startGrading = (sub: HomeworkSubmission) => {
    setGradingId(sub.id);
    setGrade(sub.grade ?? '');
    setFeedback(sub.feedback ?? '');
  };

  const saveGrade = async (sub: HomeworkSubmission) => {
    if (!grade.trim()) {
      toast.error('Enter a grade');
      return;
    }
    try {
      await gradeMutation.mutateAsync({
        submission_id: sub.id,
        homework_id: sub.homework_id,
        grade: grade.trim(),
        feedback,
      });
      toast.success('Graded');
      setGradingId(null);
      setGrade('');
      setFeedback('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save grade');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Submissions</SheetTitle>
          {homework && (
            <SheetDescription>
              {homework.title} — {homework.class?.name} {homework.class?.section} · {homework.subject?.name}
            </SheetDescription>
          )}
        </SheetHeader>

        {subsLoading || rosterLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-semibold">Submitted ({(submissions || []).length})</h3>
              </div>
              {(submissions || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              )}
              {(submissions || []).map(sub => (
                <Card key={sub.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={sub.student?.profile?.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(sub.student?.profile?.full_name || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-medium">{sub.student?.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              Roll {sub.student?.roll_number || '—'} · Submitted {sub.submitted_at ? format(new Date(sub.submitted_at), 'PP p') : '—'}
                            </p>
                          </div>
                          {sub.status === 'graded' ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              <Award className="h-3 w-3 mr-1" />
                              Graded: {sub.grade}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Awaiting grade</Badge>
                          )}
                        </div>

                        {sub.submission_text && (
                          <p className="mt-2 text-sm whitespace-pre-wrap">{sub.submission_text}</p>
                        )}
                        {sub.attachment_url && (
                          <Button size="sm" variant="ghost" className="mt-2" onClick={() => openFile(sub.attachment_url)}>
                            <FileText className="h-3 w-3 mr-1" />
                            Open file
                          </Button>
                        )}

                        {gradingId === sub.id ? (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <div className="space-y-1">
                              <Label>Grade</Label>
                              <Input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. A, 18/20, Pass" />
                            </div>
                            <div className="space-y-1">
                              <Label>Feedback (optional)</Label>
                              <Textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveGrade(sub)} disabled={gradeMutation.isPending}>
                                {gradeMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                Save grade
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setGradingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => startGrading(sub)}>
                              {sub.status === 'graded' ? 'Update grade' : 'Grade'}
                            </Button>
                          </div>
                        )}

                        {sub.feedback && gradingId !== sub.id && (
                          <div className="mt-3 rounded-md border bg-muted/40 p-2 text-sm">
                            <span className="font-medium">Feedback: </span>
                            <span className="text-muted-foreground">{sub.feedback}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold">Not submitted ({notSubmitted.length})</h3>
              </div>
              {notSubmitted.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone has submitted.</p>
              ) : (
                <div className="grid gap-2">
                  {notSubmitted.map((s: ClassRosterStudent) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-md border p-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={s.profile?.avatar_url ?? undefined} />
                        <AvatarFallback>{(s.profile?.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Roll {s.roll_number || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditHomeworkDialog({ homework, onClose }: { homework: HomeworkRow | null; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const updateHw = useUpdateHomework();
  const uploadFile = useUploadTeacherHomeworkFile();

  useEffect(() => {
    if (homework) {
      setTitle(homework.title);
      setDescription(homework.description ?? '');
      setDueDate(new Date(homework.due_date));
      setFile(null);
      setRemoveFile(false);
    }
  }, [homework]);

  const handleSave = async () => {
    if (!homework) return;
    if (!title.trim() || !dueDate) {
      toast.error('Title and due date are required');
      return;
    }
    try {
      let attachmentUrl: string | null | undefined = undefined; // undefined = keep as is
      if (removeFile && !file) attachmentUrl = null;
      if (file) {
        attachmentUrl = await uploadFile.mutateAsync({ homework_id: homework.id, file });
      }

      await updateHw.mutateAsync({
        id: homework.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        ...(attachmentUrl !== undefined ? { attachment_url: attachmentUrl } : {}),
      });
      toast.success('Homework updated');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
  };

  return (
    <Dialog open={!!homework} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit homework</DialogTitle>
          {homework && (
            <DialogDescription>
              {homework.class?.name} {homework.class?.section} · {homework.subject?.name}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Due date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Replace attachment (optional)</Label>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip" />
            {homework?.attachment_url && !file && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={removeFile} onChange={e => setRemoveFile(e.target.checked)} />
                Remove existing attachment
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateHw.isPending || uploadFile.isPending}>
              {(updateHw.isPending || uploadFile.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
