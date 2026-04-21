import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare, CheckSquare, Calendar, Sparkles, Search,
  Plus, ChevronDown, ChevronRight, LogOut, Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CreateWorkspaceModal from '@/components/workspace/CreateWorkspaceModal';
import WorkspaceDrawer from './WorkspaceDrawer';
import DeleteAccountDialog from './DeleteAccountDialog';

export default function AppSidebar({ user, currentWorkspaceId, onWorkspaceChange, _onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(true);

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => db.entities.Workspace.list(),
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['pages', currentWorkspaceId],
    queryFn: () => db.entities.Page.filter({ workspace_id: currentWorkspaceId, is_archived: false }),
    enabled: !!currentWorkspaceId,
  });

  const navItems = [
    { icon: Home,          label: 'Home',         path: '/' },
    { icon: MessageSquare, label: 'Chat',          path: '/chat' },
    { icon: CheckSquare,   label: 'Tasks',         path: '/tasks' },
    { icon: Calendar,      label: 'Meetings',      path: '/meetings' },
    { icon: Sparkles,      label: 'AI Assistant',  path: '/ai' },
    { icon: Search,        label: 'Search',        path: '/search' },
  ];

  const topLevelPages = pages.filter(p => !p.parent_page_id);

  return (
    <>
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col h-full shrink-0">
        {/* Workspace Selector */}
        <div className="p-3 border-b border-sidebar-border" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}>
          <WorkspaceDrawer
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={onWorkspaceChange}
            onCreateNew={() => setShowCreateWorkspace(true)}
          />
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link key={path} to={currentWorkspaceId ? `${path}?w=${currentWorkspaceId}` : path}>
              <div className={cn(
                "flex items-center gap-2.5 px-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer select-none min-h-[40px]",
                location.pathname === path
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </div>
            </Link>
          ))}

          {/* Pages Section */}
          {currentWorkspaceId && (
            <div className="mt-3">
              <button
                onClick={() => setPagesExpanded(!pagesExpanded)}
                className="flex items-center gap-1 w-full px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors select-none min-h-[36px]"
              >
                {pagesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Pages
                <span className="ml-auto text-xs normal-case font-normal">{topLevelPages.length}</span>
              </button>

              {pagesExpanded && (
                <div className="mt-0.5 space-y-0.5">
                  {topLevelPages.map(page => (
                    <Link key={page.id} to={`/pages/${page.id}?w=${currentWorkspaceId}`}>
                      <div className={cn(
                        "flex items-center gap-2 px-2.5 rounded-md text-sm transition-colors cursor-pointer ml-2 select-none min-h-[36px]",
                        location.pathname === `/pages/${page.id}`
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}>
                        <span className="text-base leading-none">{page.icon || '📄'}</span>
                        <span className="truncate">{page.title}</span>
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={() => navigate(`/pages/new?w=${currentWorkspaceId}`)}
                    className="flex items-center gap-2 px-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors w-full ml-2 select-none min-h-[36px]"
                  >
                    <Plus className="w-3 h-3" /> New page
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user?.full_name?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-sidebar-foreground">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => db.auth.logout()}
              className="text-muted-foreground hover:text-foreground transition-colors select-none min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <DeleteAccountDialog />
        </div>
      </aside>

      {showCreateWorkspace && (
        <CreateWorkspaceModal
          user={user}
          onClose={() => setShowCreateWorkspace(false)}
          onCreated={(ws) => { onWorkspaceChange(ws.id); setShowCreateWorkspace(false); }}
        />
      )}
    </>
  );
}