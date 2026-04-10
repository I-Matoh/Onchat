import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, getCurrentUser, signOut, redirectToLogin } from '@/api/supabaseClient';

/**
 * AuthContext - Global authentication state management
 * 
 * This context provider handles the complete auth lifecycle:
 * - Initial app load: checks for existing session and validates user
 * - Auth state: provides user object and authentication status
 * - Loading states: tracks both public settings and auth checks separately
 * - Error handling: distinguishes between "not registered" and "auth required"
 * - Logout: handles sign out with optional redirect
 * 
 * The separation of isLoadingAuth and isLoadingPublicSettings allows
 * the UI to show different loading states - first loading app config,
 * then validating user session.
 */
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  isLoadingPublicSettings: true,
  authError: null,
  logout: async () => {},
  navigateToLogin: () => {},
  checkAppState: async () => {},
});

/**
 * AuthProvider - Wraps the app to provide authentication state and methods
 * 
 * Flow on app mount:
 * 1. Check for existing Supabase session (getSession)
 * 2. If session exists, validate user via getCurrentUser API
 * 3. If no session, mark as not authenticated
 * 4. Handle errors appropriately (401/403 → redirect to login)
 * 5. Mark loading as complete once all checks finish
 */
export const AuthProvider = ({ children }) => {
  // State for current authenticated user
  const [user, setUser] = useState(null);
  // Boolean flag for auth status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Loading state for user validation (checked after session exists)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Loading state for initial app/public settings load
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  // Auth error object with type and message
  const [authError, setAuthError] = useState(null);

  // Run on mount - check session and validate user
  useEffect(() => {
    checkAppState();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Main entry point - checks for existing session then validates user
  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Check if browser has valid session cookie
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('App state check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to load app'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // Validates current user via API - throws on 401/403
  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // Clear session if unauthorized
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  // Logout handler - clears state and optionally redirects
  const logout = async (shouldRedirect = true) => {
    try {
      await signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  // Redirect to login with return URL
  const navigateToLogin = () => {
    redirectToLogin(window.location.href);
  };

  // Provide auth state and methods to consuming components
  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
