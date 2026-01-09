import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useParentData, useLinkedChildren } from '@/hooks/useParentData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ClipboardCheck, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

function useChildAttendance(studentId: string | null) {
  return useQuery({
    queryKey: ['child-attendance', studentId],
    queryFn: async () => {
      if (!studentId) return [];

      const startDate = format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export function ParentAttendancePage() {
  const { data: parent, isLoading: parentLoading } = useParentData();
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(parent?.id);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  
  const activeChildId = selectedChildId || children?.[0]?.student_id || null;
  const { data: attendance, isLoading: attendanceLoading } = useChildAttendance(activeChildId);

  const selectedChild = children?.find(c => c.student_id === activeChildId);

  if (parentLoading || childrenLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Children Linked</h3>
            <p className="text-muted-foreground">Contact admin to link your children to your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const totalDays = attendance?.length || 0;
  const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
  const absentDays = attendance?.filter(a => a.status === 'absent').length || 0;
  const lateDays = attendance?.filter(a => a.status === 'late').length || 0;
  const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">View your child's attendance records</p>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Child:</span>
              <Select
                value={activeChildId || ''}
                onValueChange={setSelectedChildId}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.student_id} value={child.student_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={child.student.profile?.avatar_url || ''} />
                          <AvatarFallback>
                            {child.student.profile?.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {child.student.profile?.full_name} - Class {child.student.class?.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Child Info */}
      {selectedChild && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-green-500">
                <AvatarImage src={selectedChild.student.profile?.avatar_url || ''} />
                <AvatarFallback>
                  {selectedChild.student.profile?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{selectedChild.student.profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  Class {selectedChild.student.class?.name} {selectedChild.student.class?.section} • Roll No. {selectedChild.student.roll_number || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{percentage}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{presentDays}</p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{absentDays}</p>
              <p className="text-sm text-muted-foreground">Days Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{lateDays}</p>
              <p className="text-sm text-muted-foreground">Days Late</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attendance?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records found</p>
          ) : (
            <div className="space-y-2">
              {attendance?.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      record.status === 'present' ? 'bg-green-100' :
                      record.status === 'absent' ? 'bg-red-100' :
                      record.status === 'late' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      <ClipboardCheck className={`h-5 w-5 ${
                        record.status === 'present' ? 'text-green-600' :
                        record.status === 'absent' ? 'text-red-600' :
                        record.status === 'late' ? 'text-yellow-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      {record.remarks && (
                        <p className="text-sm text-muted-foreground">{record.remarks}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      record.status === 'present' ? 'default' :
                      record.status === 'absent' ? 'destructive' : 'secondary'
                    }
                    className="capitalize"
                  >
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
