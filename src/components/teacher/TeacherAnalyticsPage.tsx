import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { useTeacherClasses, useExamTypes } from '@/hooks/useTeacherClasses';
import { useExamAnalyticsData, summarize } from '@/hooks/useExamAnalytics';

const ALL = '__all__';
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function TeacherAnalyticsPage() {
  const { data: classes } = useTeacherClasses();
  const { data: examTypes } = useExamTypes();

  const [classId, setClassId] = useState<string>(ALL);
  const [examTypeId, setExamTypeId] = useState<string>(ALL);

  const { data: rows, isLoading } = useExamAnalyticsData({
    exam_type_id: examTypeId === ALL ? null : examTypeId,
    class_id: classId === ALL ? null : classId,
    teacher_scope: true,
  });

  const teacherClassIds = useMemo(
    () => new Set((classes || []).map((c) => c.class_id)),
    [classes],
  );

  // Even without filters, RLS already limits teacher reads to their classes,
  // but be defensive: filter the dataset client-side too.
  const scoped = useMemo(
    () => (rows || []).filter((r) => teacherClassIds.has(r.class_id)),
    [rows, teacherClassIds],
  );

  const stats = useMemo(() => summarize(scoped), [scoped]);

  if (!classes || classes.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            You don't have any classes assigned yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          My Class Analytics
        </h1>
        <p className="text-muted-foreground">
          Performance snapshot for the classes you teach.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All My Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={`${c.class_id}-${c.subject_id}`} value={c.class_id}>
                      {c.class?.name} - {c.class?.section} ({c.subject?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Exam Type</label>
              <Select value={examTypeId} onValueChange={setExamTypeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Exam Types</SelectItem>
                  {examTypes?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stats.total === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No submitted marks for this filter yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Mark Records</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pass_pct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avg_pct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Average</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.subject_averages.length}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.subject_averages}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_pct" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.grade_distribution}
                      dataKey="count"
                      nameKey="grade"
                      outerRadius={90}
                      label
                    >
                      {stats.grade_distribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Percentage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.percentage_buckets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 Students</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.top_performers.map((p, i) => (
                      <TableRow key={p.student_id}>
                        <TableCell>
                          <Badge>#{i + 1}</Badge>
                        </TableCell>
                        <TableCell>{p.student_name}</TableCell>
                        <TableCell>{p.pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
