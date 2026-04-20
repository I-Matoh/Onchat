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
      InvokeLLM: async (input, feature = 'custom_prompt', fallbackModel = 'llama-3.3-70b-versatile') => {
        // Get current user/workspace context (ideally from a context provider)
        // For now, we'll get from supabase session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Try to get workspace ID from user metadata or a separate lookup
        // For simplicity, we'll just log user-level usage
        const response = await invokeGroq(input, fallbackModel);

        // Log AI usage asynchronously (don't block)
        try {
          await entities.AIUsageLog.create({
            workspace_id: null, // Will need workspace context; can be passed optionally
            user_id: user.id,
            feature,
            tokens_used: response.length, // rough estimate
            request_count: 1,
          });
        } catch (e) {
          console.warn('Failed to log AI usage:', e);
        }

        return response;
      }
    }
  }
};
