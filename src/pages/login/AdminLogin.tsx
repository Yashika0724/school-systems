import { Shield } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default function AdminLogin() {
  return (
    <LoginForm
      userType="admin"
      title="Admin"
      description="Complete school administration access"
      icon={<Shield className="h-10 w-10 text-white" />}
      gradientClass="bg-admin-gradient"
    />
  );
}
