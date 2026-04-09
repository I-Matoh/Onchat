import { supabase, getCurrentUser, signOut, redirectToLogin, invokeGroq } from './supabaseClient';
import { entities } from './entities';

/**
 * db - Unified API adapter for Supabase-backed data operations
 * 
 * This module provides a clean abstraction layer over Supabase, offering:
 * - Auth methods: me, logout, deleteAccount, redirectToLogin
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
    redirectToLogin: (redirectUrl) => redirectToLogin(redirectUrl)
  },
  entities,
  integrations: {
    Core: {
      InvokeLLM: invokeGroq
    }
  }
};
