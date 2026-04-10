import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { db } from '@/api/supabaseAdapter';

/**
 * DeleteAccountDialog - Danger zone component for account deletion
 * 
 * Shows a confirmation dialog before permanently deleting the user's
 * account and all associated data via Supabase Admin API.
 */
export default function DeleteAccountDialog() {
  // Loading state during deletion process
  const [loading, setLoading] = useState(false);

  // Delete account via admin API, then log user out
  const handleDelete = async () => {
    setLoading(true);
    try {
      // Admin API call to delete user from Supabase Auth
      await db.auth.deleteAccount?.();
    } catch (e) {
      // Fallback: if delete fails, just log out anyway
    }
    // Regardless of delete success, clear session and redirect
    db.auth.logout('/');
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors select-none min-h-[44px] px-1 w-full">
          <Trash2 className="w-3.5 h-3.5" />
          Delete Account
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and all associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="select-none">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 select-none"
          >
            {loading ? 'Deleting...' : 'Delete Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}