import { GraduationCap } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function StudentLogin() {
  return (
    <LoginForm
      userType="student"
      title="Student"
      description="Access your attendance, marks, and homework"
      icon={<GraduationCap className="h-10 w-10 text-white" />}
      gradientClass="bg-student-gradient"
    />
  );
}
