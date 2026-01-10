import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Users, GraduationCap, CreditCard, ClipboardCheck, TrendingUp, Loader2, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export function AdminReports() {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name');
      return data || [];
    },
  });

  // Attendance Report
  const { data: attendanceReport, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-report', selectedClass],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          student_id,
          status,
          student:students(
            id,
            roll_number,
            class:classes(name, section),
            user_id
          )
        `);

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data } = await query;
      if (!data) return [];

      // Get profiles
      const userIds = [...new Set(data.map(d => (d.student as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Aggregate by student
      const studentStats = new Map<string, { name: string; class: string; present: number; absent: number; late: number; total: number }>();

      data.forEach(record => {
        const student = record.student as any;
        if (!student?.id) return;

        const key = student.id;
        if (!studentStats.has(key)) {
          studentStats.set(key, {
            name: profileMap.get(student.user_id) || 'Unknown',
            class: `${student.class?.name || ''} ${student.class?.section || ''}`,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          });
        }

        const stats = studentStats.get(key)!;
        stats.total++;
        if (record.status === 'present') stats.present++;
        else if (record.status === 'absent') stats.absent++;
        else if (record.status === 'late') stats.late++;
      });

      return Array.from(studentStats.values())
        .map(s => ({ ...s, percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0 }))
        .sort((a, b) => b.percentage - a.percentage);
    },
  });

  // Fee Report
  const { data: feeReport, isLoading: feeLoading } = useQuery({
    queryKey: ['fee-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_invoices')
        .select(`
          *,
          student:students(
            id,
            user_id,
            class:classes(name, section)
          )
        `)
        .order('due_date', { ascending: false });

      if (!data) return { total: 0, collected: 0, pending: 0, overdue: 0, byClass: [] };

      const userIds = [...new Set(data.map(d => (d.student as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      let total = 0, collected = 0, pending = 0, overdue = 0;
      const classStats = new Map<string, { collected: number; pending: number }>();

      data.forEach(inv => {
        total += Number(inv.total_amount);
        const paid = Number(inv.paid_amount) || 0;
        collected += paid;
        const remaining = Number(inv.total_amount) - paid;
        pending += remaining;

        if (inv.status === 'overdue' || (remaining > 0 && new Date(inv.due_date) < new Date())) {
          overdue += remaining;
        }

        const className = `${(inv.student as any)?.class?.name || 'N/A'} ${(inv.student as any)?.class?.section || ''}`;
        if (!classStats.has(className)) {
          classStats.set(className, { collected: 0, pending: 0 });
        }
        const cs = classStats.get(className)!;
        cs.collected += paid;
        cs.pending += remaining;
      });

      return {
        total,
        collected,
        pending,
        overdue,
        byClass: Array.from(classStats.entries()).map(([name, stats]) => ({ name, ...stats })),
      };
    },
  });

  // Performance Report  
  const { data: performanceReport, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-report', selectedClass],
    queryFn: async () => {
      let query = supabase
        .from('marks')
        .select(`
          marks_obtained,
          max_marks,
          subject:subjects(name),
          class:classes(name, section),
          exam_type:exam_types(name)
        `);

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data } = await query;
      if (!data) return [];

      // Aggregate by subject
      const subjectStats = new Map<string, { total: number; count: number }>();

      data.forEach(mark => {
        const subject = (mark.subject as any)?.name || 'Unknown';
        if (!subjectStats.has(subject)) {
          subjectStats.set(subject, { total: 0, count: 0 });
        }
        const stats = subjectStats.get(subject)!;
        stats.total += (Number(mark.marks_obtained) / Number(mark.max_marks)) * 100;
        stats.count++;
      });

      return Array.from(subjectStats.entries())
        .map(([subject, stats]) => ({
          subject,
          average: Math.round(stats.total / stats.count),
          examsTaken: stats.count,
        }))
        .sort((a, b) => b.average - a.average);
    },
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate and view comprehensive school reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name} - {cls.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Attendance Report */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-500" />
                Attendance Report
              </CardTitle>
              <CardDescription>Student attendance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : attendanceReport && attendanceReport.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceReport.slice(0, 20).map((student, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell className="text-center text-green-600">{student.present}</TableCell>
                        <TableCell className="text-center text-red-600">{student.absent}</TableCell>
                        <TableCell className="text-center text-amber-600">{student.late}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={student.percentage >= 75 ? 'default' : 'destructive'}>
                            {student.percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attendance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Report */}
        <TabsContent value="fees" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="text-2xl font-bold">{formatCurrency(feeReport?.total || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(feeReport?.collected || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(feeReport?.pending || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(feeReport?.overdue || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Fee Collection by Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feeLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : feeReport?.byClass && feeReport.byClass.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Collection %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeReport.byClass.map((cls, idx) => {
                      const total = cls.collected + cls.pending;
                      const percentage = total > 0 ? Math.round((cls.collected / total) * 100) : 0;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(cls.collected)}</TableCell>
                          <TableCell className="text-right text-amber-600">{formatCurrency(cls.pending)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={percentage >= 80 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                              {percentage}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No fee data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Report */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Subject-wise Performance
              </CardTitle>
              <CardDescription>Average marks by subject</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : performanceReport && performanceReport.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Exams Taken</TableHead>
                      <TableHead className="text-center">Average Score</TableHead>
                      <TableHead className="text-center">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceReport.map((subject, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{subject.subject}</TableCell>
                        <TableCell className="text-center">{subject.examsTaken}</TableCell>
                        <TableCell className="text-center">{subject.average}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={
                            subject.average >= 80 ? 'default' : 
                            subject.average >= 60 ? 'secondary' : 'destructive'
                          }>
                            {subject.average >= 80 ? 'Excellent' : subject.average >= 60 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No performance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
