import { useState, useEffect } from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import AppSidebar from './AppSidebar';
import BottomTabBar from './BottomTabBar';
import { Menu } from 'lucide-react';

export default function MainLayout() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    searchParams.get('w') || localStorage.getItem('onechat_workspace') || ''
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => base44.entities.Workspace.list(),
  });

  // Auto-select first workspace
  useEffect(() => {
    if (!currentWorkspaceId && workspaces.length > 0) {
      handleWorkspaceChange(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleWorkspaceChange = (id) => {
    setCurrentWorkspaceId(id);
    localStorage.setItem('onechat_workspace', id);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-30 transition-transform duration-250
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <AppSidebar
            user={user}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {/* Mobile top bar */}
          <div
            className="lg:hidden flex items-center gap-3 px-4 border-b border-border bg-background shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors select-none min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-foreground text-sm">OneChat</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <Outlet context={{ user, currentWorkspaceId }} />
          </div>
        </main>
      </div>

      {/* Bottom tab bar (mobile only) */}
      <BottomTabBar currentWorkspaceId={currentWorkspaceId} />
    </div>
  );
}