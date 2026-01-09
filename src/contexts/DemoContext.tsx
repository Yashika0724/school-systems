import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

type DemoUserType = 'student' | 'parent' | 'teacher' | 'admin';

interface DemoContextType {
  isDemo: boolean;
  demoUserType: DemoUserType | null;
  setDemoMode: (userType: DemoUserType) => void;
  exitDemoMode: () => void;
  showDemoToast: (action: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [demoUserType, setDemoUserType] = useState<DemoUserType | null>(null);

  const setDemoMode = (userType: DemoUserType) => {
    setIsDemo(true);
    setDemoUserType(userType);
  };

  const exitDemoMode = () => {
    setIsDemo(false);
    setDemoUserType(null);
  };

  const showDemoToast = (action: string) => {
    toast.info(`Demo Mode: ${action}`, {
      description: "This is demo mode - changes won't be saved",
      duration: 3000,
    });
  };

  return (
    <DemoContext.Provider
      value={{
        isDemo,
        demoUserType,
        setDemoMode,
        exitDemoMode,
        showDemoToast,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
