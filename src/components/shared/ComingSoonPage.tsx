import { Construction, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface ComingSoonPageProps {
  title: string;
  badge?: string;
}

export function ComingSoonPage({ title, badge }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Construction className="h-10 w-10 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      
      {badge && (
        <Badge variant="secondary" className="mb-4">
          {badge}
        </Badge>
      )}
      
      <p className="text-muted-foreground max-w-md mb-6">
        This feature is coming soon in Phase 2. We're working hard to bring you the best experience.
      </p>
      
      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  );
}
