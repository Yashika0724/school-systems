import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bell, Plus, Trash2, Eye, EyeOff, Loader2, AlertCircle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  useAllAnnouncements, 
  useCreateAnnouncement, 
  useDeleteAnnouncement, 
  useToggleAnnouncement 
} from '@/hooks/useAnnouncements';

export function AnnouncementManagement() {
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    announcement_type: 'both',
    priority: 'normal',
    target_class_ids: [] as string[],
    allClasses: true,
  });

  const { data: announcements, isLoading } = useAllAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const toggleAnnouncement = useToggleAnnouncement();

  // Fetch classes for targeting
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      announcement_type: 'both',
      priority: 'normal',
      target_class_ids: [],
      allClasses: true,
    });
  };

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast.error('Please fill in title and content');
      return;
    }

    try {
      await createAnnouncement.mutateAsync({
        title: form.title,
        content: form.content,
        announcement_type: form.announcement_type,
        priority: form.priority,
        target_class_ids: form.allClasses ? [] : form.target_class_ids,
      });
      toast.success('Announcement created!');
      setIsCreating(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement.mutateAsync(id);
      toast.success('Announcement deleted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAnnouncement.mutateAsync({ id, is_active: !currentStatus });
      toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'}!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500">High</Badge>;
      case 'normal': return <Badge variant="secondary">Normal</Badge>;
      default: return <Badge variant="outline">Low</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'student': return <Badge variant="outline" className="text-blue-600">Students</Badge>;
      case 'parent': return <Badge variant="outline" className="text-green-600">Parents</Badge>;
      case 'both': return <Badge variant="outline" className="text-purple-600">Both</Badge>;
      default: return <Badge variant="outline">General</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-muted-foreground">Create and manage announcements for students and parents</p>
        </div>

        <Dialog open={isCreating} onOpenChange={(open) => {
          setIsCreating(open);
          if (!open) resetForm();
        }}>
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
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input 
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <Label>Content</Label>
                <Textarea 
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Announcement content..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Audience</Label>
                  <Select 
                    value={form.announcement_type}
                    onValueChange={(v) => setForm(prev => ({ ...prev, announcement_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Students & Parents</SelectItem>
                      <SelectItem value="student">Students Only</SelectItem>
                      <SelectItem value="parent">Parents Only</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={form.priority}
                    onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}
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

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox 
                    id="all-classes"
                    checked={form.allClasses}
                    onCheckedChange={(checked) => setForm(prev => ({ 
                      ...prev, 
                      allClasses: checked as boolean,
                      target_class_ids: checked ? [] : prev.target_class_ids,
                    }))}
                  />
                  <Label htmlFor="all-classes">Send to all classes</Label>
                </div>

                {!form.allClasses && (
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                    {classes?.map((cls) => (
                      <div key={cls.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={cls.id}
                          checked={form.target_class_ids.includes(cls.id)}
                          onCheckedChange={(checked) => {
                            setForm(prev => ({
                              ...prev,
                              target_class_ids: checked 
                                ? [...prev.target_class_ids, cls.id]
                                : prev.target_class_ids.filter(id => id !== cls.id),
                            }));
                          }}
                        />
                        <Label htmlFor={cls.id} className="text-sm">
                          {cls.name} - {cls.section}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleCreate}
                disabled={createAnnouncement.isPending}
                className="w-full"
              >
                {createAnnouncement.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
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
            <Bell className="h-5 w-5" />
            All Announcements ({announcements?.length || 0})
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
                  className={`p-4 rounded-lg border ${
                    announcement.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{announcement.title}</h4>
                        {getPriorityBadge(announcement.priority)}
                        {getTypeBadge(announcement.announcement_type)}
                        {!announcement.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Created: {format(new Date(announcement.created_at), 'PPp')}
                        </span>
                        {announcement.targets && announcement.targets.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {announcement.targets.length} class(es)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            All classes
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(announcement.id, announcement.is_active)}
                        title={announcement.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet. Create one to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
