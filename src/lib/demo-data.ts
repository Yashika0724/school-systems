// Demo data for the School Management System
// Uses realistic Indian school context

export const demoStudent = {
  id: 'demo-student-1',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@school.edu',
  phone: '+91 98765 43210',
  class: '8B',
  rollNumber: '15',
  admissionNumber: 'ADM2023001',
  dateOfBirth: '2011-05-15',
  gender: 'Male',
  bloodGroup: 'B+',
  address: '123, Shanti Nagar, New Delhi - 110001',
  emergencyContact: '+91 98765 43211',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
  attendance: {
    present: 142,
    absent: 8,
    total: 150,
    percentage: 94.67,
  },
  upcomingExams: 3,
  pendingHomework: 2,
  recentMarks: [
    { subject: 'Mathematics', marks: 92, total: 100, grade: 'A+' },
    { subject: 'Science', marks: 88, total: 100, grade: 'A' },
    { subject: 'English', marks: 85, total: 100, grade: 'A' },
    { subject: 'Hindi', marks: 90, total: 100, grade: 'A+' },
    { subject: 'Social Studies', marks: 82, total: 100, grade: 'A' },
  ],
  timetable: [
    { day: 'Monday', periods: ['English', 'Mathematics', 'Science', 'Hindi', 'Social Studies', 'PE', 'Computer'] },
    { day: 'Tuesday', periods: ['Mathematics', 'English', 'Hindi', 'Science', 'Art', 'Social Studies', 'Library'] },
    { day: 'Wednesday', periods: ['Science', 'Hindi', 'English', 'Mathematics', 'Computer', 'Music', 'Social Studies'] },
    { day: 'Thursday', periods: ['Hindi', 'Science', 'Mathematics', 'English', 'Social Studies', 'PE', 'Art'] },
    { day: 'Friday', periods: ['Mathematics', 'Science', 'English', 'Hindi', 'Music', 'Social Studies', 'Computer'] },
    { day: 'Saturday', periods: ['English', 'Mathematics', 'Science', 'Hindi', 'PE', 'Library', '-'] },
  ],
  homework: [
    { id: 1, subject: 'Mathematics', title: 'Chapter 5 - Quadratic Equations', dueDate: '2024-01-15', status: 'pending' },
    { id: 2, subject: 'Science', title: 'Lab Report - Chemical Reactions', dueDate: '2024-01-18', status: 'pending' },
    { id: 3, subject: 'English', title: 'Essay on Climate Change', dueDate: '2024-01-10', status: 'submitted' },
  ],
};

export const demoParent = {
  id: 'demo-parent-1',
  name: 'Priya Sharma',
  email: 'priya.sharma@email.com',
  phone: '+91 98765 43211',
  occupation: 'Software Engineer',
  address: '123, Shanti Nagar, New Delhi - 110001',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
  children: [
    {
      id: 'demo-student-1',
      name: 'Aarav Sharma',
      class: '8B',
      rollNumber: '15',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav',
      attendance: { percentage: 94.67 },
      recentGrade: 'A',
    },
    {
      id: 'demo-student-2',
      name: 'Ananya Sharma',
      class: '5A',
      rollNumber: '8',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya',
      attendance: { percentage: 97.5 },
      recentGrade: 'A+',
    },
  ],
  announcements: [
    { id: 1, title: 'Parent-Teacher Meeting', date: '2024-01-20', type: 'event' },
    { id: 2, title: 'Annual Sports Day', date: '2024-01-25', type: 'event' },
    { id: 3, title: 'Fee Payment Reminder', date: '2024-01-15', type: 'reminder' },
  ],
};

export const demoTeacher = {
  id: 'demo-teacher-1',
  name: 'Mrs. Sunita Gupta',
  email: 'sunita.gupta@school.edu',
  phone: '+91 98765 43212',
  employeeId: 'TCH2020015',
  designation: 'Senior Mathematics Teacher',
  qualification: 'M.Sc. Mathematics, B.Ed.',
  joiningDate: '2020-07-01',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sunita',
  assignedClasses: [
    { class: '8A', subject: 'Mathematics', students: 35, isClassTeacher: false },
    { class: '8B', subject: 'Mathematics', students: 32, isClassTeacher: true },
    { class: '9A', subject: 'Mathematics', students: 38, isClassTeacher: false },
  ],
  todaySchedule: [
    { period: 1, class: '8A', subject: 'Mathematics', time: '8:00 - 8:45' },
    { period: 2, class: '8B', subject: 'Mathematics', time: '8:45 - 9:30' },
    { period: 3, class: '9A', subject: 'Mathematics', time: '9:30 - 10:15' },
    { period: 5, class: '8B', subject: 'Extra Class', time: '11:00 - 11:45' },
  ],
  pendingTasks: {
    attendanceToMark: 2,
    homeworkToReview: 5,
    leaveRequests: 3,
  },
  recentStudents: [
    { name: 'Aarav Sharma', class: '8B', performance: 'Excellent' },
    { name: 'Rohan Patel', class: '8A', performance: 'Good' },
    { name: 'Ishita Verma', class: '9A', performance: 'Average' },
  ],
};

export const demoAdmin = {
  id: 'demo-admin-1',
  name: 'Dr. Rajesh Kumar',
  email: 'principal@school.edu',
  phone: '+91 98765 43200',
  designation: 'Principal',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh',
  schoolStats: {
    totalStudents: 1250,
    totalTeachers: 65,
    totalParents: 980,
    totalClasses: 24,
    attendanceToday: 94.2,
    feeCollected: 85,
  },
  recentActivities: [
    { type: 'enrollment', message: 'New student enrolled in Class 5A', time: '2 hours ago' },
    { type: 'fee', message: 'Fee payment received from 15 parents', time: '4 hours ago' },
    { type: 'leave', message: '3 teacher leave requests pending', time: '5 hours ago' },
    { type: 'event', message: 'Annual Day preparation started', time: '1 day ago' },
  ],
  pendingApprovals: {
    teacherLeaves: 3,
    studentAdmissions: 5,
    feeWaivers: 2,
  },
  upcomingEvents: [
    { name: 'Parent-Teacher Meeting', date: '2024-01-20' },
    { name: 'Republic Day Celebration', date: '2024-01-26' },
    { name: 'Annual Sports Day', date: '2024-02-05' },
  ],
};

export const demoClasses = [
  { id: 1, name: '1', section: 'A', students: 30, classTeacher: 'Mrs. Kavita Singh' },
  { id: 2, name: '1', section: 'B', students: 28, classTeacher: 'Mr. Amit Sharma' },
  { id: 3, name: '2', section: 'A', students: 32, classTeacher: 'Mrs. Rekha Patel' },
  { id: 4, name: '5', section: 'A', students: 35, classTeacher: 'Mrs. Meera Joshi' },
  { id: 5, name: '8', section: 'A', students: 35, classTeacher: 'Mr. Vikram Singh' },
  { id: 6, name: '8', section: 'B', students: 32, classTeacher: 'Mrs. Sunita Gupta' },
  { id: 7, name: '9', section: 'A', students: 38, classTeacher: 'Mr. Rahul Verma' },
  { id: 8, name: '10', section: 'A', students: 40, classTeacher: 'Mrs. Anita Sharma' },
];

export const demoSubjects = [
  'English',
  'Hindi',
  'Mathematics',
  'Science',
  'Social Studies',
  'Computer Science',
  'Physical Education',
  'Art',
  'Music',
  'Sanskrit',
];

export const demoAnnouncements = [
  {
    id: 1,
    title: 'Winter Vacation Notice',
    content: 'School will remain closed from Dec 25 to Jan 5 for winter vacation.',
    date: '2024-01-02',
    priority: 'high',
  },
  {
    id: 2,
    title: 'Annual Sports Day',
    content: 'Annual Sports Day will be held on February 5th. All students are requested to participate.',
    date: '2024-01-10',
    priority: 'medium',
  },
  {
    id: 3,
    title: 'Fee Payment Reminder',
    content: 'Last date for fee payment for Quarter 4 is January 15th.',
    date: '2024-01-08',
    priority: 'high',
  },
];
