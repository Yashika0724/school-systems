import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationsRealtime,
  type NotificationType,
  type NotificationPriority,
} from '@/hooks/useNotifications';

const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const TYPE_LABELS: { value: 'all' | NotificationType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'marks', label: 'Marks' },
  { value: 'fees', label: 'Fees' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'custom', label: 'Messages' },
  { value: 'general', label: 'General' },
];

export function NotificationsInboxPage() {
  useNotificationsRealtime();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications(200);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.read_at) return false;
    if (filter !== 'all' && n.type !== filter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount === 0
              ? 'All caught up'
              : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | NotificationType)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_LABELS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showUnreadOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowUnreadOnly((v) => !v)}
        >
          Unread only
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No notifications</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={cn(
                'p-4 cursor-pointer hover:bg-accent/40 transition-colors',
                !n.read_at && 'border-primary/40 bg-accent/20',
              )}
              onClick={() => {
                if (!n.read_at) markRead.mutate(n.id);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                  !n.read_at ? 'bg-primary' : 'bg-transparent',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={cn('uppercase text-[10px]', priorityColors[n.priority])} variant="secondary">
                      {n.type}
                    </Badge>
                    {n.priority !== 'normal' && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {n.priority}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {n.message}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.read_at && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                      title="Mark read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
