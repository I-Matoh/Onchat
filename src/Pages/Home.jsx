import { useOutletContext, Link } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery } from '@tanstack/react-query';
import { FileText, MessageSquare, CheckSquare, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import ActivityFeed from '@/components/home/ActivityFeed';

/**
 * Home - Dashboard/landing page for authenticated users
 * 
 * This is the main entry point after login, providing a consolidated view
 * of the user's workspace. It displays:
 * - Statistics: counts of pages, channels (conversations), and tasks
 * - Recent Pages: last 5 edited pages in the workspace
 * - My Tasks: incomplete tasks assigned to the current user
 * - AI Assistant: quick access link to the AI features
 * 
 * Data is fetched via React Query with workspace-scoped queries.
 * The component waits for currentWorkspaceId from the outlet context
 * before triggering data fetches.
 */
export default function Home() {
  // Get user and workspace from parent layout context
  const { user, currentWorkspaceId } = useOutletContext();

  // Fetch pages for current workspace - exclude archived
  const { data: pages = [] } = useQuery({
    queryKey: ['pages', currentWorkspaceId],
    queryFn: () => db.entities.Page.filter({ workspace_id: currentWorkspaceId, is_archived: false }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch all tasks in workspace
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => db.entities.Task.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch conversations/channels in workspace
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentWorkspaceId],
    queryFn: () => db.entities.Conversation.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  // Get 5 most recently updated pages
  const recentPages = [...pages].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 5);
  // Get incomplete tasks assigned to current user
  const myTasks = tasks.filter(t => t.assignee_email === user?.email && t.status !== 'done').slice(0, 5);

  // Dashboard stats for header cards
  const stats = [
    { label: 'Pages', value: pages.length, icon: FileText, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { label: 'Channels', value: conversations.length, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Tasks', value: tasks.filter(t => t.status !== 'done').length, icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-cal font-semibold text-foreground">
            Good {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening in your workspace.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="p-4 border border-border/60 shadow-sm">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Pages */}
          <Card className="p-5 border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-500" /> Recent Pages
              </h2>
              <Link to={`/pages/new?w=${currentWorkspaceId}`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> New
                </Button>
              </Link>
            </div>
            {recentPages.length === 0 ? (
              <EmptyState icon="📄" text="No pages yet" action="Create your first page" href={`/pages/new?w=${currentWorkspaceId}`} />
            ) : (
              <div className="space-y-1">
                {recentPages.map(page => (
                  <Link key={page.id} to={`/pages/${page.id}?w=${currentWorkspaceId}`}>
                    <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/60 transition-colors group">
                      <span className="text-base">{page.icon || '📄'}</span>
                      <span className="flex-1 text-sm truncate text-foreground">{page.title}</span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                        {formatDistanceToNow(new Date(page.updated_date), { addSuffix: true })}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* My Tasks */}
          <Card className="p-5 border border-border/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-green-500" /> My Tasks
              </h2>
              <Link to={`/tasks?w=${currentWorkspaceId}`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs">View all</Button>
              </Link>
            </div>
            {myTasks.length === 0 ? (
              <EmptyState icon="✅" text="No pending tasks" action="Go to tasks" href={`/tasks?w=${currentWorkspaceId}`} />
            ) : (
              <div className="space-y-1">
                {myTasks.map(task => (
                  <Link key={task.id} to={`/tasks?w=${currentWorkspaceId}`}>
                    <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/60 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="flex-1 text-sm truncate">{task.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-muted text-muted-foreground'
                      }`}>{task.status === 'in_progress' ? 'In progress' : 'Todo'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* AI Quick Access */}
          <Card className="lg:col-span-2 p-5 border border-primary/20 bg-gradient-to-r from-accent/30 to-transparent shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">AI Assistant</p>
                <p className="text-sm text-muted-foreground">Ask questions, summarize content, extract action items</p>
              </div>
              <Link to={`/ai?w=${currentWorkspaceId}`}>
                <Button size="sm" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Open AI
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text, action, href }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      <Link to={href}>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <Plus className="w-3 h-3" /> {action}
        </Button>
      </Link>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}