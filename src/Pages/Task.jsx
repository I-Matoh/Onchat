import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckSquare, Circle, Clock, AlertCircle, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';

const STATUS_CONFIG = {
  todo: { label: 'Todo', icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  done: { label: 'Done', icon: CheckSquare, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-muted-foreground border-muted' },
  medium: { label: 'Medium', color: 'text-yellow-600 border-yellow-300 dark:border-yellow-600' },
  high: { label: 'High', color: 'text-red-600 border-red-300 dark:border-red-700' },
};

export default function Tasks() {
  const { user, currentWorkspaceId } = useOutletContext();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => base44.entities.Task.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  const updateStatus = async (taskId, newStatus) => {
    await base44.entities.Task.update(taskId, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['tasks', currentWorkspaceId] });
  };

  const deleteTask = async (taskId) => {
    await base44.entities.Task.delete(taskId);
    queryClient.invalidateQueries({ queryKey: ['tasks', currentWorkspaceId] });
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);
  const grouped = {
    todo: filtered.filter(t => t.status === 'todo'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    done: filtered.filter(t => t.status === 'done'),
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-cal font-semibold text-foreground">Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} total • {tasks.filter(t => t.status !== 'done').length} open</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No tasks yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first task to get started</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Create Task
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(grouped).map(([status, statusTasks]) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              return (
                <div key={status} className="space-y-2">
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                    <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded-full">{statusTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={updateStatus}
                        onDelete={deleteTask}
                        currentStatus={status}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          workspaceId={currentWorkspaceId}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={() => { queryClient.invalidateQueries({ queryKey: ['tasks', currentWorkspaceId] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onStatusChange, onDelete, currentStatus }) {
  const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const nextStatus = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-2">
        <button
          onClick={() => onStatusChange(task.id, nextStatus[currentStatus])}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title="Advance status"
        >
          {currentStatus === 'done'
            ? <CheckSquare className="w-4 h-4 text-green-500" />
            : <Circle className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-tight", currentStatus === 'done' && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", priorityCfg.color)}>
              {priorityCfg.label}
            </span>
            {task.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.assignee_email && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignee_email.split('@')[0]}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}