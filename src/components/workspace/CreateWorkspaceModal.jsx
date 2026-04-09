import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * CreateWorkspaceModal - Dialog for creating new workspaces
 * 
 * Note: Uses direct Supabase client instead of db adapter.
 * Could be refactored to use db.entities.Workspace.create()
 * 
 * Props:
 * - user: current authenticated user (for owner_id)
 * - onClose: callback to close modal
 * - onCreated: callback with created workspace data
 */
export default function CreateWorkspaceModal({ user, onClose, onCreated }) {
  // Handle form submit - create workspace directly via Supabase
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    
    try {
      // Insert new workspace with current user as owner
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      onCreated?.(data);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input id="name" name="name" placeholder="My Workspace" required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
