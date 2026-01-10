import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useClassLeaveRequests, useUpdateLeaveStatus, LeaveRequest } from '@/hooks/useLeaveManagement';

export function TeacherLeaveApprovalsPage() {
  const { data: leaveRequests, isLoading } = useClassLeaveRequests();
  const updateStatus = useUpdateLeaveStatus();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    await updateStatus.mutateAsync({
      id: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      review_notes: reviewNotes,
    });
    
    setSelectedRequest(null);
    setReviewNotes('');
    setActionType(null);
  };

  const pendingRequests = leaveRequests?.filter(r => r.status === 'pending') || [];
  const processedRequests = leaveRequests?.filter(r => r.status !== 'pending') || [];

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'sick': return 'Sick Leave';
      case 'personal': return 'Personal Leave';
      case 'family': return 'Family Emergency';
      case 'other': return 'Other';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Student Leave Requests
        </h1>
        <p className="text-muted-foreground">
          Review and manage leave requests from students in your class
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingRequests.length}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaveRequests?.filter(r => r.status === 'approved').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {leaveRequests?.filter(r => r.status === 'rejected').length || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingRequests.length > 0 ? (
            pendingRequests.map((request) => (
              <LeaveRequestCard 
                key={request.id} 
                request={request}
                onApprove={() => {
                  setSelectedRequest(request);
                  setActionType('approve');
                }}
                onReject={() => {
                  setSelectedRequest(request);
                  setActionType('reject');
                }}
                showActions
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No pending leave requests</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4 mt-4">
          {processedRequests.length > 0 ? (
            processedRequests.map((request) => (
              <LeaveRequestCard 
                key={request.id} 
                request={request}
                showActions={false}
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No processed requests</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setReviewNotes('');
        setActionType(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedRequest.profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedRequest.profile?.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedRequest.profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getLeaveTypeLabel(selectedRequest.leave_type)} • 
                    {format(new Date(selectedRequest.start_date), 'PP')} - {format(new Date(selectedRequest.end_date), 'PP')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {selectedRequest.reason}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_notes">
                  Review Notes {actionType === 'reject' && '(Required for rejection)'}
                </Label>
                <Textarea
                  id="review_notes"
                  placeholder="Add any notes for the student..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedRequest(null);
                setReviewNotes('');
                setActionType(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={updateStatus.isPending || (actionType === 'reject' && !reviewNotes)}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LeaveRequestCardProps {
  request: LeaveRequest;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

function LeaveRequestCard({ request, onApprove, onReject, showActions = true }: LeaveRequestCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'sick': return 'Sick Leave';
      case 'personal': return 'Personal Leave';
      case 'family': return 'Family Emergency';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const startDate = new Date(request.start_date);
  const endDate = new Date(request.end_date);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const classInfo = request.student?.class;
  const classDisplay = classInfo 
    ? (Array.isArray(classInfo) ? `${classInfo[0]?.name}-${classInfo[0]?.section}` : `${classInfo.name}-${classInfo.section}`)
    : '';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.profile?.avatar_url || undefined} />
              <AvatarFallback>
                {request.profile?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{request.profile?.full_name || 'Unknown Student'}</span>
                {classDisplay && (
                  <Badge variant="outline">Class {classDisplay}</Badge>
                )}
                {getStatusBadge(request.status)}
              </div>
              <p className="text-sm font-medium text-primary">
                {getLeaveTypeLabel(request.leave_type)}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, 'PP')} - {format(endDate, 'PP')} ({daysDiff} day{daysDiff > 1 ? 's' : ''})
              </p>
              <p className="text-sm mt-2 text-muted-foreground">{request.reason}</p>
              {request.review_notes && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <span className="font-medium">Review Notes: </span>
                  {request.review_notes}
                </div>
              )}
            </div>
          </div>

          {showActions && request.status === 'pending' && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onReject}>
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" onClick={onApprove}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
