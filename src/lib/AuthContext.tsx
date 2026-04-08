import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, getCurrentUser, signOut, redirectToLogin } from '@/api/supabaseClient';
import { appParams } from '@/lib/app-params';

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
const AuthContext = createContext();

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
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
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
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

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

  const navigateToLogin = () => {
    redirectToLogin(window.location.href);
  };

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
