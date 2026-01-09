import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useToggleAnnouncement } from '@/hooks/useAnnouncements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Megaphone, Trash2, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export function TeacherAnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: teacherClasses } = useTeacherClasses();
  const { data: announcements, isLoading } = useTeacherAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const toggleAnnouncement = useToggleAnnouncement();
  
  // Check if teacher is a class teacher of any class
  const isClassTeacher = teacherClasses?.some(tc => tc.is_class_teacher) || false;
  const classTeacherClasses = teacherClasses?.filter(tc => tc.is_class_teacher) || [];
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    announcement_type: 'student' as 'student' | 'parent' | 'both' | 'general',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    targetAllClasses: false,
    selectedClasses: [] as string[],
  });
  
  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      announcement_type: 'student',
      priority: 'normal',
      targetAllClasses: false,
      selectedClasses: [],
    });
  };
  
  const handleCreate = async () => {
    if (!user) return;
    
    if (!form.title || !form.content) {
      toast.error('Please fill in title and content');
      return;
    }
    
    if (!form.targetAllClasses && form.selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }
    
    try {
      await createAnnouncement.mutateAsync({
        title: form.title,
        content: form.content,
        announcement_type: form.announcement_type,
        priority: form.priority,
        target_class_ids: form.targetAllClasses ? [] : form.selectedClasses,
      });
      
      toast.success('Announcement created successfully');
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast.success('Announcement deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };
  
  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAnnouncement.mutateAsync({ id, is_active: !currentStatus });
      toast.success(currentStatus ? 'Announcement hidden' : 'Announcement visible');
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle');
    }
  };
  
  const handleClassToggle = (classId: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      selectedClasses: checked
        ? [...prev.selectedClasses, classId]
        : prev.selectedClasses.filter(id => id !== classId),
    }));
  };
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'normal': return <Badge variant="secondary">Normal</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'student': return <Badge variant="outline" className="text-blue-600 border-blue-300">Students</Badge>;
      case 'parent': return <Badge variant="outline" className="text-green-600 border-green-300">Parents</Badge>;
      case 'both': return <Badge variant="outline" className="text-purple-600 border-purple-300">Both</Badge>;
      case 'general': return <Badge variant="outline">General</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  if (!isClassTeacher) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Class Teacher Access Only</h3>
            <p className="text-muted-foreground">
              Only class teachers can create announcements. If you believe you should have access, please contact the administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Create and manage announcements for your classes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Announcement title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  placeholder="Announcement content..."
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={form.announcement_type}
                    onValueChange={(value: any) => setForm(prev => ({ ...prev, announcement_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Students Only</SelectItem>
                      <SelectItem value="parent">Parents Only</SelectItem>
                      <SelectItem value="both">Students & Parents</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value: any) => setForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Target Classes</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-classes"
                      checked={form.targetAllClasses}
                      onCheckedChange={(checked) =>
                        setForm(prev => ({ ...prev, targetAllClasses: !!checked, selectedClasses: [] }))
                      }
                    />
                    <label htmlFor="all-classes" className="text-sm">All my classes</label>
                  </div>
                  
                  {!form.targetAllClasses && (
                    <div className="pl-6 space-y-2 border-l-2 ml-2">
                      {classTeacherClasses.map((tc) => (
                        <div key={tc.class_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={tc.class_id}
                            checked={form.selectedClasses.includes(tc.class_id)}
                            onCheckedChange={(checked) =>
                              handleClassToggle(tc.class_id, !!checked)
                            }
                          />
                          <label htmlFor={tc.class_id} className="text-sm">
                            {tc.class?.name} - {tc.class?.section}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createAnnouncement.isPending}
              >
                {createAnnouncement.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Your Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-medium">{announcement.title}</h4>
                        {getPriorityBadge(announcement.priority || 'normal')}
                        {getTypeBadge(announcement.announcement_type)}
                        {!announcement.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">Hidden</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {format(new Date(announcement.created_at), 'PPp')}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(announcement.id, announcement.is_active ?? true)}
                      >
                        {announcement.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet</p>
              <p className="text-sm">Create your first announcement to notify students and parents</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
