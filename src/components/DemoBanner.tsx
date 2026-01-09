import { AlertTriangle, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';

interface DemoBannerProps {
  userType: 'student' | 'parent' | 'teacher' | 'admin';
}

export function DemoBanner({ userType }: DemoBannerProps) {
  const navigate = useNavigate();
  const { exitDemoMode } = useDemo();

  const handleExitDemo = () => {
    exitDemoMode();
    navigate('/');
  };

  const handleLogin = () => {
    exitDemoMode();
    navigate(`/login/${userType}`);
  };

  return (
    <div className="demo-banner px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Demo Mode - Exploring as {userType.charAt(0).toUpperCase() + userType.slice(1)}
        </span>
        <span className="text-xs opacity-80 hidden sm:inline">
          (Changes won't be saved)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs bg-white/20 hover:bg-white/30"
          onClick={handleLogin}
        >
          <LogIn className="h-3 w-3 mr-1" />
          Login to Real Account
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/30"
          onClick={handleExitDemo}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
