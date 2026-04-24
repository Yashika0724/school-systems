import { GraduationCap, Users, BookOpen, Shield, ArrowRight, Play, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/blocks/hero-section-9';

const userTypes = [
  {
    type: 'student',
    title: 'Student',
    description: 'Access your attendance, marks, timetable, and homework',
    icon: GraduationCap,
    accent: 'text-orange-500',
    accentBg: 'bg-orange-500/10',
    accentDot: 'bg-orange-500',
    loginPath: '/login/student',
    demoPath: '/demo/student',
    features: ['View Attendance', 'Check Marks', 'See Timetable', 'Submit Homework'],
  },
  {
    type: 'parent',
    title: 'Parent',
    description: "Track your child's progress, fees, and communicate with teachers",
    icon: Users,
    accent: 'text-green-600',
    accentBg: 'bg-green-600/10',
    accentDot: 'bg-green-600',
    loginPath: '/login/parent',
    demoPath: '/demo/parent',
    features: ['Child Progress', 'Fee Management', 'Teacher Contact', 'Announcements'],
  },
  {
    type: 'teacher',
    title: 'Teacher',
    description: 'Manage classes, mark attendance, and upload assignments',
    icon: BookOpen,
    accent: 'text-purple-600',
    accentBg: 'bg-purple-600/10',
    accentDot: 'bg-purple-600',
    loginPath: '/login/teacher',
    demoPath: '/demo/teacher',
    features: ['Mark Attendance', 'Upload Marks', 'Post Homework', 'Class Management'],
  },
  {
    type: 'admin',
    title: 'Admin',
    description: 'Complete school administration and user management',
    icon: Shield,
    accent: 'text-blue-600',
    accentBg: 'bg-blue-600/10',
    accentDot: 'bg-blue-600',
    loginPath: '/login/admin',
    demoPath: '/demo/admin',
    features: ['User Management', 'Class Setup', 'Reports', 'System Settings'],
  },
];

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-dashed">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" aria-label="KnctED home" className="flex items-center">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-dashed bg-muted/40 px-3.5 py-1 mb-5 text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              Portals
            </div>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] mb-4">
              Choose your portal
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg mx-auto">
              Login to your account or explore the demo to see how KnctED fits your school.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {userTypes.map((userType) => {
              const Icon = userType.icon;
              return (
                <div
                  key={userType.type}
                  className="group relative flex flex-col rounded-xl border bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-foreground/20"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${userType.accentBg} mb-5`}>
                    <Icon className={`h-4 w-4 ${userType.accent}`} strokeWidth={2} />
                  </div>

                  <h3 className="text-[17px] font-medium tracking-tight mb-1.5">{userType.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {userType.description}
                  </p>

                  <ul className="text-sm text-muted-foreground space-y-1.5 mb-6 flex-1">
                    {userType.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className={`h-1 w-1 rounded-full ${userType.accentDot}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <Button
                      className="w-full rounded-full"
                      size="sm"
                      onClick={() => navigate(userType.loginPath)}
                    >
                      Login
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      size="sm"
                      onClick={() => navigate(userType.demoPath)}
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      Try Demo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
