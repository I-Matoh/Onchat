import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MainLayout from '@/components/layout/MainLayout';

// Page imports
import Home from '@/Pages/Home';
import Chat from '@/Pages/Chat';
import PageEditor from '@/Pages/PageEditor';
import Tasks from '@/Pages/Task';
import AIAssistant from '@/Pages/AIAssistant';
import Search from '@/Pages/Search';
import Landing from '@/Pages/Landing';
/**
 * AuthenticatedApp - Handles routing and auth state for logged-in users
 * 
 * This component serves as the main router for authenticated users. It:
 * - Displays a loading spinner while checking auth and public settings
 * - Shows appropriate error states for auth failures (not registered, needs login)
 * - Renders the main app routes via React Router
 * - Uses a nested route structure with MainLayout for consistent UI shell
 */
const AuthenticatedApp = () => {
  // Auth state from context - includes loading states, user object, and any auth errors
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError } = useAuth();

  // Show loading spinner while checking public settings or auth status
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading OneChat...</p>
        </div>
      </div>
    );
  }

  // Handle auth errors - either user not registered or needs to login
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }
  
  // Show the public marketing site when there is no authenticated session
  if (!isLoadingAuth && !isLoadingPublicSettings && !isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  // Main route definitions - MainLayout provides sidebar and outlet context
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/pages/:pageId" element={<PageEditor />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/search" element={<Search />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
