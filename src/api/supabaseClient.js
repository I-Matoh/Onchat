import { createClient } from '@supabase/supabase-js';
import { appParams } from '@/lib/app-params';

/**
 * Supabase Client Configuration
 * 
 * Initializes the Supabase client with the following settings:
 * - URL and anon key from environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * - Session persistence enabled (stores JWT in localStorage)
 * - Auto token refresh enabled (handles token expiration transparently)
 * 
 * The anon key is safe to expose client-side as it only allows limited
 * operations. Row-level security (RLS) policies on the database enforce
 * proper data access control.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * getCurrentUser - Retrieves the currently authenticated user
 * 
 * Uses supabase.auth.getUser() which validates the JWT token rather than
 * just reading from localStorage. This is more secure as it verifies
 * the token hasn't been tampered with or expired.
 * 
 * @throws Error if no session exists or token is invalid
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const redirectToLogin = (redirectUrl) => {
  const loginUrl = new URL(import.meta.env.VITE_SUPABASE_LOGIN_URL || '/login');
  loginUrl.searchParams.set('redirect', redirectUrl);
  window.location.href = loginUrl.toString();
};

export const invokeGroq = async (prompt, model = 'llama-3.3-70b-versatile') => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
};
