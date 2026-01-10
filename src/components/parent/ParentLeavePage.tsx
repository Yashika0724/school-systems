import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateLeaveRequest, LeaveRequest } from '@/hooks/useLeaveManagement';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export function ParentLeavePage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: linkedChildren, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const createLeave = useCreateLeaveRequest();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Transform linked children for easier use
  const children = linkedChildren?.map(lc => ({
    user_id: lc.student.profile?.full_name ? lc.student_id : '',
    student_id: lc.student_id,
    full_name: lc.student.profile?.full_name || 'Unknown',
    class_name: lc.student.class?.name || '',
    section: lc.student.class?.section || '',
  })) || [];

  // Get user_ids from students table for leave requests
  const { data: studentUserIds } = useQuery({
    queryKey: ['student-user-ids', children?.map(c => c.student_id)],
    queryFn: async () => {
      if (!children || children.length === 0) return {};
      const studentIds = children.map(c => c.student_id);
      const { data } = await supabase
        .from('students')
        .select('id, user_id')
        .in('id', studentIds);
      return Object.fromEntries(data?.map(s => [s.id, s.user_id]) || []);
    },
    enabled: children.length > 0,
  });

  // Get leave requests for all children
  const userIds = Object.values(studentUserIds || {}).filter(Boolean) as string[];
  const { data: childrenLeaveRequests = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['children-leave-requests', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: userIds.length > 0,
  });

  if (parentLoading || childrenLoading || leavesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async () => {
    const childUserId = studentUserIds?.[selectedChild];
    if (!selectedChild || !leaveType || !startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    if (!childUserId) {
      toast.error('Could not find student user ID');
      return;
    }

    await createLeave.mutateAsync({
      user_id: childUserId,
      user_type: 'student',
      leave_type: leaveType as 'sick' | 'personal' | 'family' | 'other',
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedChild('');
    setLeaveType('');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sick: 'Sick Leave',
      personal: 'Personal Leave',
      family: 'Family Emergency',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getChildName = (userId: string) => {
    // Find student_id from user_id
    const studentId = Object.entries(studentUserIds || {}).find(([, uid]) => uid === userId)?.[0];
    const child = children?.find(c => c.student_id === studentId);
    return child?.full_name || 'Unknown';
  };

  const pendingRequests = childrenLeaveRequests.filter(r => r.status === 'pending');
  const historyRequests = childrenLeaveRequests.filter(r => r.status !== 'pending');

  const stats = {
    total: childrenLeaveRequests.length,
    pending: pendingRequests.length,
    approved: childrenLeaveRequests.filter(r => r.status === 'approved').length,
    rejected: childrenLeaveRequests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Requests</h1>
          <p className="text-muted-foreground">Apply for leave on behalf of your children</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit a leave request for your child</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Child *</Label>
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children?.map((child) => (
                      <SelectItem key={child.student_id} value={child.student_id}>
                        {child.full_name} - {child.class_name} {child.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="family">Family Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea 
                  placeholder="Please provide a reason for the leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={createLeave.isPending}
              >
                {createLeave.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  'Submit Leave Request'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({historyRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending leave requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <LeaveRequestCard 
                key={request.id} 
                request={request} 
                childName={getChildName(request.user_id)}
                getStatusBadge={getStatusBadge}
                getLeaveTypeLabel={getLeaveTypeLabel}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {historyRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leave history</p>
              </CardContent>
            </Card>
          ) : (
            historyRequests.map((request) => (
              <LeaveRequestCard 
                key={request.id} 
                request={request}
                childName={getChildName(request.user_id)}
                getStatusBadge={getStatusBadge}
                getLeaveTypeLabel={getLeaveTypeLabel}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaveRequestCard({ 
  request, 
  childName,
  getStatusBadge, 
  getLeaveTypeLabel 
}: { 
  request: LeaveRequest;
  childName: string;
  getStatusBadge: (status: string) => React.ReactNode;
  getLeaveTypeLabel: (type: string) => string;
}) {
  const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{childName}</span>
            </div>
            <CardTitle className="text-lg">{getLeaveTypeLabel(request.leave_type)}</CardTitle>
            <CardDescription>
              {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')} ({days} day{days > 1 ? 's' : ''})
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{request.reason}</p>
        <p className="text-xs text-muted-foreground">
          Applied on {format(new Date(request.created_at), 'MMM dd, yyyy')}
        </p>
        {request.review_notes && (
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <strong>Review Notes:</strong> {request.review_notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
