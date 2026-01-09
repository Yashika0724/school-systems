import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, BookOpen, Calendar, Loader2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses, type TeacherClass } from '@/hooks/useTeacherClasses';
import { cn } from '@/lib/utils';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  class: { name: string; section: string };
  subject: { name: string };
}

export function HomeworkPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teacherClasses, isLoading: classesLoading } = useTeacherClasses();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch homework assigned by this teacher
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
      })) as Homework[];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!selectedClass || !title || !dueDate || !user) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('homework').insert({
        title,
        description: description || null,
        subject_id: selectedClass.subject_id,
        class_id: selectedClass.class_id,
        assigned_by: user.id,
        due_date: format(dueDate, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      toast.success('Homework assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['teacher-homework'] });
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate(undefined);
      setSelectedClass(null);
      setIsDialogOpen(false);
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
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', homeworkId);

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
          <p className="text-muted-foreground">Assign and manage homework for your classes</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  value={selectedClass?.class_id || ''}
                  onValueChange={(classId) => {
                    const cls = teacherClasses?.find(c => c.class_id === classId);
                    setSelectedClass(cls || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses?.map((cls) => (
                      <SelectItem key={`${cls.class_id}-${cls.subject_id}`} value={cls.class_id}>
                        {cls.class?.name} - {cls.class?.section} ({cls.subject?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Chapter 5 Exercises"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed instructions for the homework..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'Select due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Homework'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Homework List */}
      {homeworkLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : homeworkList && homeworkList.length > 0 ? (
        <div className="grid gap-4">
          {homeworkList.map((homework) => {
            const status = getDueDateStatus(homework.due_date);
            return (
              <Card key={homework.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{homework.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {homework.class?.name} - {homework.class?.section} • {homework.subject?.name}
                        </p>
                        {homework.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {homework.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Due: {format(new Date(homework.due_date), 'PPP')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-col">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(homework.id)}
                        className="text-destructive hover:text-destructive"
                      >
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
            <p className="text-muted-foreground mb-4">
              You haven't assigned any homework yet. Click the button above to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {teacherClasses && teacherClasses.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Classes Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any classes assigned yet. Please contact the administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
