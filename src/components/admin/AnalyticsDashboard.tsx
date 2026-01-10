import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAttendanceAnalytics,
  useClassPerformance,
  useMonthlyFeeCollection,
  useSubjectPerformance,
  useDashboardStats,
} from '@/hooks/useAnalytics';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AnalyticsDashboard() {
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceAnalytics();
  const { data: classPerformance, isLoading: classLoading } = useClassPerformance();
  const { data: feeCollection, isLoading: feeLoading } = useMonthlyFeeCollection();
  const { data: subjectPerformance, isLoading: subjectLoading } = useSubjectPerformance();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into school performance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <GraduationCap className="h-6 w-6 text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.totalStudents || 0}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <BookOpen className="h-6 w-6 text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.totalTeachers || 0}</p>
                <p className="text-xs text-muted-foreground">Teachers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Users className="h-6 w-6 text-green-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.totalParents || 0}</p>
                <p className="text-xs text-muted-foreground">Parents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <ClipboardCheck className="h-6 w-6 text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.attendanceToday || 0}%</p>
                <p className="text-xs text-muted-foreground">Today's Attendance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <CreditCard className="h-6 w-6 text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{stats?.feeCollected || 0}%</p>
                <p className="text-xs text-muted-foreground">Fee Collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <TrendingUp className="h-6 w-6 text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalFeeCollected || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Collected</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
              Attendance Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : attendanceData && attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No attendance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Collection Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Fee Collection (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : feeCollection && feeCollection.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={feeCollection}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No fee data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-500" />
              Class-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : classPerformance && classPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="className" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={60}
                    tickFormatter={(value, index) => {
                      const item = classPerformance[index];
                      return `${value}-${item?.section || ''}`;
                    }}
                  />
                  <Tooltip formatter={(value: number) => [`${value}%`]} />
                  <Legend />
                  <Bar dataKey="averageMarks" name="Avg. Marks (%)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="attendanceRate" name="Attendance (%)" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No class performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-500" />
              Subject-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjectLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : subjectPerformance && subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="averageMarks"
                    nameKey="subject"
                    label={({ subject, averageMarks }) => `${subject}: ${averageMarks}%`}
                    labelLine={false}
                  >
                    {subjectPerformance.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Avg. Marks']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No subject performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary Table */}
      {classPerformance && classPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Class</th>
                    <th className="text-center py-3 px-4 font-medium">Students</th>
                    <th className="text-center py-3 px-4 font-medium">Avg. Marks</th>
                    <th className="text-center py-3 px-4 font-medium">Attendance Rate</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {classPerformance.map((cls, index) => (
                    <tr key={index} className="border-b last:border-b-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{cls.className} {cls.section}</td>
                      <td className="py-3 px-4 text-center">{cls.studentCount}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${
                          cls.averageMarks >= 80 ? 'text-green-600' :
                          cls.averageMarks >= 60 ? 'text-blue-600' :
                          cls.averageMarks >= 40 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {cls.averageMarks}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${
                          cls.attendanceRate >= 90 ? 'text-green-600' :
                          cls.attendanceRate >= 75 ? 'text-blue-600' :
                          cls.attendanceRate >= 60 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {cls.attendanceRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          cls.averageMarks >= 70 && cls.attendanceRate >= 80 
                            ? 'bg-green-100 text-green-800' 
                            : cls.averageMarks >= 50 && cls.attendanceRate >= 60 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {cls.averageMarks >= 70 && cls.attendanceRate >= 80 
                            ? 'Excellent' 
                            : cls.averageMarks >= 50 && cls.attendanceRate >= 60 
                              ? 'Average'
                              : 'Needs Attention'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
