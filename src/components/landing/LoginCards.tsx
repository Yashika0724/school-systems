import { GraduationCap, Users, BookOpen, Shield, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const userTypes = [
  {
    type: 'student',
    title: 'Student',
    description: 'Access your attendance, marks, timetable, and homework',
    icon: GraduationCap,
    gradient: 'bg-student-gradient',
    themeClass: 'theme-student',
    loginPath: '/login/student',
    demoPath: '/demo/student',
    features: ['View Attendance', 'Check Marks', 'See Timetable', 'Submit Homework'],
  },
  {
    type: 'parent',
    title: 'Parent',
    description: "Track your child's progress, fees, and communicate with teachers",
    icon: Users,
    gradient: 'bg-parent-gradient',
    themeClass: 'theme-parent',
    loginPath: '/login/parent',
    demoPath: '/demo/parent',
    features: ['Child Progress', 'Fee Management', 'Teacher Contact', 'Announcements'],
  },
  {
    type: 'teacher',
    title: 'Teacher',
    description: 'Manage classes, mark attendance, and upload assignments',
    icon: BookOpen,
    gradient: 'bg-teacher-gradient',
    themeClass: 'theme-teacher',
    loginPath: '/login/teacher',
    demoPath: '/demo/teacher',
    features: ['Mark Attendance', 'Upload Marks', 'Post Homework', 'Class Management'],
  },
  {
    type: 'admin',
    title: 'Admin',
    description: 'Complete school administration and user management',
    icon: Shield,
    gradient: 'bg-admin-gradient',
    themeClass: 'theme-admin',
    loginPath: '/login/admin',
    demoPath: '/demo/admin',
    features: ['User Management', 'Class Setup', 'Reports', 'System Settings'],
  },
];

export function LoginCards() {
  const navigate = useNavigate();

  return (
    <section id="login-section" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Portal</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Login to your account or explore the demo to see how Vidya Setu can help your school
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {userTypes.map((userType) => (
            <Card
              key={userType.type}
              className={`${userType.themeClass} group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl`}
            >
              {/* Gradient header */}
              <div className={`${userType.gradient} h-24 flex items-center justify-center`}>
                <userType.icon className="h-12 w-12 text-white" />
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{userType.title}</CardTitle>
                <CardDescription className="text-sm">
                  {userType.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features list */}
                <ul className="text-sm text-muted-foreground space-y-1">
                  {userType.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Action buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={() => navigate(userType.loginPath)}
                  >
                    Login
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(userType.demoPath)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Try Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
