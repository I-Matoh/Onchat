import {
  supabase,
  getCurrentUser,
  signOut,
  redirectToLogin,
  redirectToSignup,
  signInWithPassword,
  signUpWithPassword,
  invokeGroq,
} from './supabaseClient';
import { entities } from './entities';

/**
 * db - Unified API adapter for Supabase-backed data operations
 * 
 * This module provides a clean abstraction layer over Supabase, offering:
 * - Auth methods: me, login, signup, logout, deleteAccount, redirectToLogin, redirectToSignup
 * - Entity CRUD: Page, Task, Conversation, Message, Workspace
 * 
 * The entities object is dynamically generated from database schema
 * and provides standard create/filter/update/delete/subscribe methods
 * for each entity type. This allows the UI to interact with data without
 * knowing the underlying Supabase implementation details.
 */
export const db = {
  auth: {
    me: getCurrentUser,
    login: ({ email, password }) => signInWithPassword({ email, password }),
    signup: ({ email, password, fullName, redirectTo }) => (
      signUpWithPassword({ email, password, fullName, redirectTo })
    ),
    logout: async (redirectUrl) => {
      await signOut();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    deleteAccount: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
    },
    redirectToLogin: (redirectUrl) => redirectToLogin(redirectUrl),
    redirectToSignup: (redirectUrl) => redirectToSignup(redirectUrl)
  },
  entities,
  integrations: {
    Core: {
      InvokeLLM: invokeGroq
    }
  }
};
