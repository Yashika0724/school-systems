import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAllParents } from '@/hooks/useAdminStats';
import { Link, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ParentsListProps {
  searchQuery: string;
}

// Hook to fetch all students for linking
function useAllStudentsForLinking() {
  return useQuery({
    queryKey: ['all-students-for-linking'],
    queryFn: async () => {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, user_id, roll_number, class_id')
        .order('roll_number');

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return [];

      // Get profiles
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Get classes
      const classIds = [...new Set(students.filter(s => s.class_id).map(s => s.class_id))];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, section')
        .in('id', classIds);

      return students.map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id),
        class: classes?.find(c => c.id === s.class_id),
      }));
    },
  });
}

// Hook to fetch linked children for a parent
function useLinkedChildrenForParent(parentId: string | null) {
  return useQuery({
    queryKey: ['linked-children', parentId],
    queryFn: async () => {
      if (!parentId) return [];

      const { data: links, error } = await supabase
        .from('parent_student')
        .select('id, student_id, relationship')
        .eq('parent_id', parentId);

      if (error) throw error;
      if (!links || links.length === 0) return [];

      // Get student details
      const studentIds = links.map(l => l.student_id);
      const { data: students } = await supabase
        .from('students')
        .select('id, user_id, roll_number, class_id')
        .in('id', studentIds);

      if (!students) return [];

      // Get profiles
      const userIds = students.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Get classes
      const classIds = [...new Set(students.filter(s => s.class_id).map(s => s.class_id))];
      const { data: classes } = classIds.length > 0 ? await supabase
        .from('classes')
        .select('id, name, section')
        .in('id', classIds) : { data: [] };

      return links.map(link => {
        const student = students.find(s => s.id === link.student_id);
        return {
          linkId: link.id,
          studentId: link.student_id,
          relationship: link.relationship,
          studentName: profiles?.find(p => p.user_id === student?.user_id)?.full_name || 'Unknown',
          className: student?.class_id ? 
            (() => {
              const cls = classes?.find(c => c.id === student.class_id);
              return cls ? `${cls.name} - ${cls.section}` : '-';
            })() : '-',
          rollNumber: student?.roll_number || '-',
        };
      });
    },
    enabled: !!parentId,
  });
}

export function ParentsList({ searchQuery }: ParentsListProps) {
  const queryClient = useQueryClient();
  const { data: parents, isLoading, error } = useAllParents();
  const { data: allStudents } = useAllStudentsForLinking();
  
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship] = useState('parent');

  const { data: linkedChildren, isLoading: childrenLoading } = useLinkedChildrenForParent(selectedParentId);

  const linkChildMutation = useMutation({
    mutationFn: async ({ parentId, studentId, relationship }: { parentId: string; studentId: string; relationship: string }) => {
      const { error } = await supabase
        .from('parent_student')
        .insert({
          parent_id: parentId,
          student_id: studentId,
          relationship,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Child linked successfully');
      queryClient.invalidateQueries({ queryKey: ['linked-children', selectedParentId] });
      setSelectedStudentId('');
      setRelationship('parent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link child');
    },
  });

  const unlinkChildMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('parent_student')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Child unlinked');
      queryClient.invalidateQueries({ queryKey: ['linked-children', selectedParentId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlink child');
    },
  });

  const handleOpenLinkDialog = (parentId: string) => {
    setSelectedParentId(parentId);
    setIsLinkDialogOpen(true);
  };

  const handleLinkChild = () => {
    if (!selectedParentId || !selectedStudentId) return;
    linkChildMutation.mutate({
      parentId: selectedParentId,
      studentId: selectedStudentId,
      relationship,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Error loading parents. Please try again.
        </CardContent>
      </Card>
    );
  }

  const filteredParents = parents?.filter((parent) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      parent.profile?.full_name?.toLowerCase().includes(query) ||
      parent.profile?.email?.toLowerCase().includes(query) ||
      parent.occupation?.toLowerCase().includes(query)
    );
  });

  if (!filteredParents?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {searchQuery ? 'No parents found matching your search.' : 'No parents registered yet.'}
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get already linked student IDs for the current parent
  const linkedStudentIds = linkedChildren?.map(c => c.studentId) || [];
  const availableStudents = allStudents?.filter(s => !linkedStudentIds.includes(s.id)) || [];

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parent</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParents.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={parent.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {parent.profile?.full_name ? getInitials(parent.profile.full_name) : 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{parent.profile?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{parent.profile?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{parent.profile?.phone || '-'}</TableCell>
                  <TableCell>{parent.occupation || '-'}</TableCell>
                  <TableCell className="capitalize">{parent.relationship || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenLinkDialog(parent.id)}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Link Child
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Link Child Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Child to Parent</DialogTitle>
            <DialogDescription>
              Link a student to this parent account to give them access to the child's information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Show currently linked children */}
            {childrenLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading linked children...
              </div>
            ) : linkedChildren && linkedChildren.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Currently Linked Children</Label>
                <div className="space-y-2">
                  {linkedChildren.map((child) => (
                    <div key={child.linkId} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div>
                        <p className="font-medium text-sm">{child.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.className} | Roll: {child.rollNumber} | {child.relationship}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkChildMutation.mutate(child.linkId)}
                        disabled={unlinkChildMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No children linked yet.</p>
            )}

            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-medium">Link New Child</Label>
              
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.profile?.full_name || 'Unknown'} 
                        {student.class ? ` (${student.class.name}-${student.class.section})` : ''}
                        {student.roll_number ? ` - Roll: ${student.roll_number}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Father</SelectItem>
                    <SelectItem value="mother">Mother</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleLinkChild}
                disabled={!selectedStudentId || linkChildMutation.isPending}
              >
                {linkChildMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link Child'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
