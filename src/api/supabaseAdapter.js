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
      InvokeLLM: async (input, options = {}) => {
        const { workspaceId, feature = 'custom_prompt', userId } = options;
        const fallbackModel = options.fallbackModel || 'llama-3.3-70b-versatile';

        // Optionally enforce free tier limits
        if (workspaceId) {
          try {
            const { data: workspace } = await supabase
              .from('workspaces')
              .select('subscription_tier, owner_id')
              .eq('id', workspaceId)
              .single();

            const { data: { user: currentUser } } = await supabase.auth.getUser();

            // If workspace is free and current user is not the owner, check usage
            if (workspace && workspace.subscription_tier === 'free' && currentUser && workspace.owner_id !== currentUser.id) {
              const startOfMonth = new Date();
              startOfMonth.setDate(1);
              startOfMonth.setHours(0, 0, 0, 0);

              const { count } = await supabase
                .from('ai_usage_logs')
                .select('*', { count: 'exact', head: true })
                .eq('workspace_id', workspaceId)
                .eq('feature', feature)
                .gte('created_at', startOfMonth.toISOString());

              if (count >= 10) {
                throw new Error('Free plan limit reached: 10 AI requests per month. Upgrade to continue.');
              }
            }
          } catch (err) {
            console.warn('Usage check failed:', err);
            // Don't block; continue
          }
        }

        // Call Groq
        const response = await invokeGroq(input, fallbackModel);

        // Log usage
        if (workspaceId) {
          try {
            await entities.AIUsageLog.create({
              workspace_id: workspaceId,
              user_id: userId || (await getCurrentUser())?.id,
              feature,
              tokens_used: response.length,
              request_count: 1,
            });
          } catch (e) {
            console.warn('Failed to log AI usage:', e);
          }
        }

        return response;
      }
    }
  }
};
