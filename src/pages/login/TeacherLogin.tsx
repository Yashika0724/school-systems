import { BookOpen } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function TeacherLogin() {
  return (
    <LoginForm
      userType="teacher"
      title="Teacher"
      description="Manage your classes and student progress"
      icon={<BookOpen className="h-10 w-10 text-white" />}
      gradientClass="bg-teacher-gradient"
    />
  );
}
