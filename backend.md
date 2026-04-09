# Onchat Backend Setup Guide

This document outlines how to implement the backend for Onchat using Supabase, following security and scalability best practices.

---

## Architecture Overview

| Layer | Technology |
|-------|------------|
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| AI | Groq API |

---

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings → API
3. Install Supabase CLI: `npm install -g supabase`

---

## Database Schema

Execute the following SQL in the Supabase SQL Editor to create tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages
CREATE TABLE public.pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content JSONB,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_pages_workspace ON public.pages(workspace_id);
CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
```

---

## Row Level Security (RLS) Policies

Enable RLS and create policies for each table:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Workspaces: Owner and members can access
CREATE POLICY "Workspace owner full access" ON public.workspaces
  FOR ALL USING (auth.uid() = owner_id);

-- Tasks: Workspace members can access
CREATE POLICY "Task workspace access" ON public.tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- Pages: Workspace members can access
CREATE POLICY "Page workspace access" ON public.pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- Conversations: Workspace members can access
CREATE POLICY "Conversation workspace access" ON public.conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- Messages: Conversation participants can access
CREATE POLICY "Message conversation access" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.workspaces w ON w.id = c.workspace_id
      WHERE c.id = conversation_id AND w.owner_id = auth.uid()
    )
  );
```

---

## Auto-create Profile Trigger

Create a trigger to automatically create a profile when a user signs up:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Real-time Configuration

Enable real-time for tables that need live updates:

```sql
-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_LOGIN_URL=/login
VITE_GROQ_API_KEY=your-groq-api-key
```

**Security Note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Security Best Practices

1. **RLS Always On**: Never disable Row Level Security
2. **Least Privilege**: Use service role key only on server-side, never expose in client
3. **Input Validation**: Validate all user inputs before database operations
4. **Secure Headers**: Configure Supabase to return security headers
5. **Rate Limiting**: Enable Supabase Pro for rate limiting on free tier

---

## Scalability Considerations

1. **Connection Pooling**: Supabase handles this automatically
2. **Database Indexes**: Already created for common query patterns
3. **Caching**: Implement TanStack Query caching (already configured)
4. **Real-time Limits**: Use filters to subscribe only to relevant changes
5. **Large Datasets**: Implement pagination in entity queries

```sql
-- Example paginated query
SELECT * FROM messages 
WHERE conversation_id = $1 
ORDER BY created_at DESC 
LIMIT 20 OFFSET $2;
```

---

## Testing

1. Test authentication flow (signup, login, logout)
2. Test RLS policies with different user accounts
3. Test real-time subscriptions
4. Verify foreign key constraints work correctly
5. Test error handling for unauthorized access

---

## Supabase Management Commands

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push schema changes
supabase db push

# Open Supabase dashboard
supabase dashboard

# Generate types (optional, for TypeScript)
supabase gen types typescript --linked > src/types/supabase.ts
```
