import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationsRealtime,
  type AppNotification,
  type NotificationPriority,
} from '@/hooks/useNotifications';

interface NotificationBellProps {
  userType: 'student' | 'parent' | 'teacher' | 'admin';
}

const priorityStyles: Record<NotificationPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function NotificationBell({ userType }: NotificationBellProps) {
  useNotificationsRealtime();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications(10);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const handleClick = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread`}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'group p-3 hover:bg-accent/50 cursor-pointer transition-colors',
                    !n.read_at && 'bg-accent/30',
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                        !n.read_at ? 'bg-primary' : 'bg-transparent',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
                            priorityStyles[n.priority],
                          )}
                        >
                          {n.type}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {formatRelative(n.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-tight truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead.mutate(n.id);
                          }}
                          title="Mark read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          del.mutate(n.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-sm" asChild>
            <Link to={`/${userType}/notifications`}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
