import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/hooks/useAnnouncements';

interface AnnouncementCarouselProps {
  announcements: Announcement[];
  autoPlay?: boolean;
  interval?: number;
}

export function AnnouncementCarousel({ 
  announcements, 
  autoPlay = true, 
  interval = 5000 
}: AnnouncementCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay || announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, announcements.length]);

  if (announcements.length === 0) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? announcements.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 border-red-500/30 text-red-700';
      case 'high': return 'bg-orange-500/10 border-orange-500/30 text-orange-700';
      case 'normal': return 'bg-blue-500/10 border-blue-500/30 text-blue-700';
      default: return 'bg-muted border-muted-foreground/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'normal': return <Bell className="h-5 w-5 text-blue-600" />;
      default: return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const current = announcements[currentIndex];

  return (
    <Card className={cn('relative overflow-hidden transition-colors', getPriorityColor(current.priority))}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {getPriorityIcon(current.priority)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{current.title}</h4>
              {current.priority === 'urgent' && (
                <Badge variant="destructive" className="text-xs">Urgent</Badge>
              )}
              {current.priority === 'high' && (
                <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">Important</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{current.content}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(current.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          {announcements.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                {currentIndex + 1} / {announcements.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Dots indicator */}
      {announcements.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {announcements.map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                index === currentIndex ? 'bg-primary' : 'bg-primary/30'
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
