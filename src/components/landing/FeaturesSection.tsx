import {
  Calendar,
  FileText,
  Bell,
  CreditCard,
  Bus,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Library,
  Heart,
  CalendarDays,
  HelpCircle,
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    title: 'Attendance Tracking',
    description: 'Real-time attendance marking and tracking for students and teachers',
  },
  {
    icon: FileText,
    title: 'Marks & Reports',
    description: 'Comprehensive exam management with detailed report cards',
  },
  {
    icon: Calendar,
    title: 'Timetable Management',
    description: 'Class-wise timetables accessible to all stakeholders',
  },
  {
    icon: BookOpen,
    title: 'Homework & Assignments',
    description: 'Post, submit, and review homework with Google Drive integration',
  },
  {
    icon: CreditCard,
    title: 'Fee Management',
    description: 'Complete fee structure, payment tracking, and reminders',
  },
  {
    icon: Bell,
    title: 'Announcements',
    description: 'School-wide and class-specific communication system',
  },
  {
    icon: MessageSquare,
    title: 'Parent-Teacher Communication',
    description: 'Direct messaging and meeting scheduling',
  },
  {
    icon: Bus,
    title: 'Transport Management',
    description: 'Bus routes, driver details, and student assignments',
  },
  {
    icon: Library,
    title: 'Library System',
    description: 'Book catalog, issue/return tracking, and fine management',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    description: 'Apply and approve leaves for students and teachers',
  },
  {
    icon: Heart,
    title: 'Health Records',
    description: 'Medical history, vaccinations, and emergency contacts',
  },
  {
    icon: HelpCircle,
    title: 'Complaint System',
    description: 'Submit and track complaints with anonymous option',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything Your School Needs
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A comprehensive suite of features designed specifically for Indian schools
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-card border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
