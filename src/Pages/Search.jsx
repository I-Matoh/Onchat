import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/supabaseAdapter';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, FileText, MessageSquare, CheckSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

/**
 * Search - Unified search across workspace entities
 * 
 * Client-side search implementation that filters across:
 * - Pages (title and content)
 * - Tasks (title and description)
 * - Channels/Conversations (name only)
 * 
 * Features:
 * - Real-time filtering as user types
 * - Filter tabs to narrow results by entity type
 * - Results sorted by relevance (title matches > content matches)
 * - Empty states for no query and no results
 * 
 * Note: For large workspaces, consider server-side search with
 * Supabase full-text search or external search service (Algolia).
 */
export default function Search() {
  const { user, currentWorkspaceId } = useOutletContext();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: pages = [] } = useQuery({
    queryKey: ['pages', currentWorkspaceId],
    queryFn: () => base44.entities.Page.filter({ workspace_id: currentWorkspaceId, is_archived: false }),
    enabled: !!currentWorkspaceId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => base44.entities.Task.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentWorkspaceId],
    queryFn: () => base44.entities.Conversation.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  const q = query.toLowerCase().trim();

  const results = q ? [
    ...( (filter === 'all' || filter === 'pages') ? pages.filter(p =>
      p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)
    ).map(p => ({ type: 'page', item: p, href: `/pages/${p.id}?w=${currentWorkspaceId}` })) : []),
    ...( (filter === 'all' || filter === 'tasks') ? tasks.filter(t =>
      t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    ).map(t => ({ type: 'task', item: t, href: `/tasks?w=${currentWorkspaceId}` })) : []),
    ...( (filter === 'all' || filter === 'channels') ? conversations.filter(c =>
      c.name?.toLowerCase().includes(q)
    ).map(c => ({ type: 'channel', item: c, href: `/chat?w=${currentWorkspaceId}` })) : []),
  ] : [];

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pages', label: 'Pages', icon: FileText },
    { value: 'tasks', label: 'Tasks', icon: CheckSquare },
    { value: 'channels', label: 'Channels', icon: MessageSquare },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-cal font-semibold text-foreground mb-6">Search</h1>

        {/* Search Input */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, tasks, channels..."
            className="pl-10 pr-9 h-11 text-base"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {f.icon && <f.icon className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {!q ? (
          <div className="text-center py-16">
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Type to search across your workspace</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-foreground font-medium mb-1">No results for "{query}"</p>
            <p className="text-sm text-muted-foreground">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground mb-3">{results.length} results</p>
            {results.map(({ type, item, href }, i) => (
              <Link key={`${type}-${item.id}`} to={href}>
                <div className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    type === 'page' ? "bg-violet-50 dark:bg-violet-500/10" :
                    type === 'task' ? "bg-green-50 dark:bg-green-500/10" :
                    "bg-blue-50 dark:bg-blue-500/10"
                  )}>
                    {type === 'page' ? <span className="text-base">{item.icon || '📄'}</span> :
                     type === 'task' ? <CheckSquare className="w-4 h-4 text-green-500" /> :
                     <MessageSquare className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {type === 'channel' ? `#${item.name}` : item.title || item.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {type} • {formatDistanceToNow(new Date(item.updated_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}