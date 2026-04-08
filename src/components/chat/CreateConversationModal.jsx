import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateConversationModal({ workspaceId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const conv = await base44.entities.Conversation.create({
      workspace_id: workspaceId,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: 'channel',
    });
    setLoading(false);
    onCreated(conv);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Channel Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="general"
              className="mt-1"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <p className="text-xs text-muted-foreground mt-1">Channel names are lowercase with hyphens.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || loading}>
              {loading ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}