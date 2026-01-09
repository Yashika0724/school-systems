import { Users } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function ParentLogin() {
  return (
    <LoginForm
      userType="parent"
      title="Parent"
      description="Track your child's progress and communicate with teachers"
      icon={<Users className="h-10 w-10 text-white" />}
      gradientClass="bg-parent-gradient"
    />
  );
}
