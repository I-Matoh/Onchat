import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, CheckSquare, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { icon: Home,         label: 'Home',   path: '/' },
  { icon: MessageSquare, label: 'Chat',   path: '/chat' },
  { icon: CheckSquare,  label: 'Tasks',  path: '/tasks' },
  { icon: Search,       label: 'Search', path: '/search' },
];

export default function BottomTabBar({ currentWorkspaceId }) {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden flex items-stretch border-t border-border bg-background shrink-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path;
        const href = currentWorkspaceId ? `${path}?w=${currentWorkspaceId}` : path;
        return (
          <Link
            key={path}
            to={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] select-none transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}