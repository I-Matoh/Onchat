import { useEffect } from 'react';
import { db } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MessageSquare, CheckSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * ActivityFeed - Real-time activity stream for the workspace
 * 
 * Aggregates recent activity from:
 * - Pages: creation and updates
 * - Tasks: status changes and completions
 * - Messages: new chat messages
 * 
 * Features:
 * - Real-time updates via Supabase subscriptions
 * - Polling fallback every 10 seconds
 * - Sorted by timestamp, latest first (capped at 12 items)
 */

// Combine and normalize data from all three sources into activity events
function buildEvents(pages, tasks, messages) {
  const events = [];

  // Convert pages to events
  pages.forEach(p => {
    events.push({
      id: `page-${p.id}`,
      type: 'page',
      label: `Page "${p.title}" was ${p.last_edited_by ? 'updated' : 'created'}`,
      sub: p.last_edited_by || p.created_by || '',
      date: p.updated_date,
    });
  });

  // Convert tasks to events
  tasks.forEach(t => {
    const statusLabel = t.status === 'done' ? 'completed' : t.status === 'in_progress' ? 'started' : 'created';
    events.push({
      id: `task-${t.id}`,
      type: 'task',
      label: `Task "${t.title}" ${statusLabel}`,
      sub: t.assignee_email || t.created_by || '',
      date: t.updated_date,
    });
  });

  // Convert messages to events
  messages.forEach(m => {
    events.push({
      id: `msg-${m.id}`,
      type: 'message',
      label: `${m.sender_name || m.sender_email} sent a message`,
      sub: m.content?.slice(0, 60) || '',  // Truncate long messages
      date: m.created_date,
    });
  });

  // Filter out entries without dates, sort newest first, keep top 12
  return events
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);
}

// Visual styling config for each activity type
const TYPE_STYLES = {
  page:    { icon: FileText,      bg: 'bg-violet-50 dark:bg-violet-500/10', color: 'text-violet-500' },
  task:    { icon: CheckSquare,   bg: 'bg-green-50 dark:bg-green-500/10',   color: 'text-green-500' },
  message: { icon: MessageSquare, bg: 'bg-blue-50 dark:bg-blue-500/10',     color: 'text-blue-500'  },
};

export default function ActivityFeed({ workspaceId }) {
  const queryClient = useQueryClient();

  // Fetch recent pages (last edited first)
  const { data: pages = [] } = useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: () => db.entities.Page.filter({ workspace_id: workspaceId, is_archived: false }),
    enabled: !!workspaceId,
  });

  // Fetch all tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: () => db.entities.Task.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  });

  // Fetch last 20 messages, poll every 10s as backup for real-time
  const { data: messages = [] } = useQuery({
    queryKey: ['recent-messages', workspaceId],
    queryFn: () => db.entities.Message.filter({ workspace_id: workspaceId }, '-created_date', 20),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });

  // Subscribe to real-time changes - invalidate queries on any change
  useEffect(() => {
    if (!workspaceId) return;
    const unsubs = [
      db.entities.Page.subscribe(() => queryClient.invalidateQueries({ queryKey: ['pages', workspaceId] })),
      db.entities.Task.subscribe(() => queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] })),
      db.entities.Message.subscribe((e) => {
        // Only invalidate if message belongs to this workspace
        if (e.data?.workspace_id === workspaceId)
          queryClient.invalidateQueries({ queryKey: ['recent-messages', workspaceId] });
      }),
    ];
    // Cleanup all subscriptions on unmount or workspace change
    return () => unsubs.forEach(u => u());
  }, [workspaceId]);

  const events = buildEvents(pages, tasks, messages);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No recent activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map(event => {
        const cfg = TYPE_STYLES[event.type];
        const Icon = cfg.icon;
        return (
          <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
              <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug truncate">{event.label}</p>
              {event.sub && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{event.sub}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}