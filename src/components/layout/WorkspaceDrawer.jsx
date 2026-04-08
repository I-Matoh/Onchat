import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkspaceDrawer({ workspaces, currentWorkspaceId, onWorkspaceChange, onCreateNew }) {
  const [open, setOpen] = useState(false);
  const current = workspaces.find(w => w.id === currentWorkspaceId);

  const handleSelect = (id) => {
    onWorkspaceChange(id);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="w-full flex items-center gap-2 bg-sidebar-accent text-sidebar-foreground text-sm font-semibold rounded-md px-3 py-2 border border-sidebar-border select-none hover:bg-sidebar-accent/80 transition-colors">
          <span className="truncate flex-1 text-left">
            {current ? `${current.icon || '🏢'} ${current.name}` : 'No workspace'}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Switch Workspace</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-1">
          {workspaces.map(w => (
            <button
              key={w.id}
              onClick={() => handleSelect(w.id)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors select-none min-h-[48px] text-left"
            >
              <span className="text-xl">{w.icon || '🏢'}</span>
              <span className="flex-1 font-medium text-sm text-foreground">{w.name}</span>
              {w.id === currentWorkspaceId && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
          <button
            onClick={() => { setOpen(false); onCreateNew(); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors select-none min-h-[48px] text-muted-foreground"
          >
            <span className="text-xl">➕</span>
            <span className="text-sm font-medium">New Workspace</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}