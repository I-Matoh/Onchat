import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

/**
 * PublicPageViewer - Read-only page view for publicly shared pages
 * 
 * This component allows users without authentication to view pages
 * that have been shared publicly via a secure token.
 * 
 * Features:
 * - Loads page by public_token (not by ID)
 * - Renders TipTap content as static HTML
 * - Shows loading state while fetching
 * - Displays error if page not found or not public
 */
export default function PublicPageViewer() {
  const { token } = useParams();

  const { data: page, isLoading, error: fetchError } = useQuery({
    queryKey: ['publicPage', token],
    queryFn: async () => {
      const pages = await db.entities.Page.filter({ public_token: token, is_public: true });
      if (pages.length === 0) throw new Error('Page not found');
      return pages[0];
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-4 p-8">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <div className="space-y-2 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">
            This page either doesn't exist, has been removed, or is not publicly shared.
          </p>
        </div>
      </div>
    );
  }

  // Render page in read-only mode (reusing PageEditor but with constraints)
  // For a simpler approach, we can just render content directly
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-6xl">{page.icon || '📄'}</span>
          <div>
            <h1 className="text-4xl font-cal font-bold text-foreground">
              {page.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Shared via OneChat • Public page
            </p>
          </div>
        </div>

        {/* Page content - render TipTap JSON as HTML */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {/* In a real implementation, we'd use a TipTap read-only renderer */}
          {/* For now, we'll just JSON display or simple HTML serialization */}
          <div className="bg-muted/30 p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-2">Page Content</h3>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(page.content, null, 2)}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              (Public view will render the formatted content here.)
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            Powered by <span className="font-semibold text-primary">OneChat</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
