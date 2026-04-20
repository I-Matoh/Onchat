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
  ai_usage_count INTEGER DEFAULT 0,
  ai_usage_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  icon TEXT DEFAULT '🏢',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (with view_type support)
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  view_type TEXT DEFAULT 'kanban' CHECK (view_type IN ('kanban', 'table')),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_email TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (with public sharing support)
CREATE TABLE public.pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content JSONB,
  page_type TEXT DEFAULT 'doc' CHECK (page_type IN ('doc', 'database', 'meeting_notes')),
  icon TEXT DEFAULT '📄',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  parent_page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  last_edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  public_token UUID DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(public_token)
);

-- Conversations (channels)
CREATE TABLE public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  type TEXT DEFAULT 'channel' CHECK (type IN ('channel', 'direct')),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (with threading support)
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'meeting_note')),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_email TEXT,
  sender_name TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions (emoji reactions on messages)
CREATE TABLE public.reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Meetings (with transcripts)
CREATE TABLE public.meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  recording_url TEXT,
  transcript TEXT,
  transcript_status TEXT DEFAULT 'pending' CHECK (transcript_status IN ('pending', 'processing', 'completed', 'failed')),
  auto_join_enabled BOOLEAN DEFAULT FALSE,
  meeting_type TEXT DEFAULT 'video' CHECK (meeting_type IN ('audio', 'video', 'both')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ended_at TIMESTAMPTZ,
  participants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting participants
CREATE TABLE public.meeting_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  attended BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, email)
);

-- Calendar events (for integration with Google Calendar)
CREATE TABLE public.calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  external_event_id TEXT, -- Google Calendar event ID
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendee_emails TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members (for team collaboration)
CREATE TABLE public.workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Integrations (track connected apps)
CREATE TABLE public.integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'github', 'jira', 'salesforce', 'slack')),
  access_token TEXT,
  refresh_token TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

-- AI usage tracking (for tier limits)
CREATE TABLE public.ai_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL CHECK (feature IN ('page_summary', 'extract_actions', 'meeting_transcript', 'chat', 'custom_prompt')),
  tokens_used INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page blocks (for block-based editor structure)
CREATE TABLE public.page_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'heading', 'image', 'video', 'file', 'embedly', 'code', 'todo', 'callout', 'divider', 'table', 'database', 'meeting_notes')),
  content JSONB DEFAULT '{}',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_pages_workspace ON public.pages(workspace_id);
CREATE INDEX idx_pages_public ON public.pages(is_public, public_token) WHERE is_public = TRUE;
CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_reactions_message ON public.reactions(message_id);
CREATE INDEX idx_meetings_workspace ON public.meetings(workspace_id);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX idx_calendar_events_workspace ON public.calendar_events(workspace_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_integrations_workspace ON public.integrations(workspace_id);
CREATE INDEX idx_ai_usage_workspace ON public.ai_usage_logs(workspace_id, created_at);
CREATE INDEX idx_page_blocks_page ON public.page_blocks(page_id);
```

---

## Row Level Security (RLS) Policies

Enable RLS and create policies for each table:

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Workspaces: Owners and members can access
CREATE POLICY "Workspace owner full access" ON public.workspaces
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Workspace members can view" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
    )
  );

-- Tasks: Workspace members can access
CREATE POLICY "Task workspace access" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE tasks.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Pages: Workspace members can access, public pages accessible without auth
CREATE POLICY "Page workspace access" ON public.pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE pages.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "Public pages readable" ON public.pages
  FOR SELECT USING (is_public = TRUE);

-- Conversations: Workspace members can access
CREATE POLICY "Conversation workspace access" ON public.conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE conversations.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Messages: Conversation participants can access
CREATE POLICY "Message conversation access" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.workspaces w ON w.id = c.workspace_id
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE messages.conversation_id = c.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Reactions: Message viewers can add/remove reactions
CREATE POLICY "Reaction access" ON public.reactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      JOIN public.workspaces w ON c.workspace_id = w.id
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE m.id = reactions.message_id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Meetings: Workspace members can access
CREATE POLICY "Meeting workspace access" ON public.meetings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE meetings.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Meeting participants: Meeting attendees can view/manage
CREATE POLICY "Meeting participant access" ON public.meeting_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      JOIN public.workspaces w ON m.workspace_id = w.id
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE m.id = meeting_participants.meeting_id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Calendar events: Workspace members can access
CREATE POLICY "Calendar event workspace access" ON public.calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE calendar_events.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Workspace members: Members can view, admins can modify
CREATE POLICY "Workspace member access" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

-- Integrations: Workspace owners/admins can manage
CREATE POLICY "Integration workspace access" ON public.integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE integrations.workspace_id = w.id AND (w.owner_id = auth.uid() OR (wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')))
    )
  );

-- AI usage logs: Workspace members can view their own, admins can view all
CREATE POLICY "AI usage log access" ON public.ai_usage_logs
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE ai_usage_logs.workspace_id = w.id AND (w.owner_id = auth.uid() OR wm.role IN ('owner', 'admin'))
    )
  );

-- Page blocks: Page editors can manage
CREATE POLICY "Page block access" ON public.page_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.workspaces w ON p.workspace_id = w.id
      LEFT JOIN public.workspace_members wm ON w.id = wm.workspace_id
      WHERE p.id = page_blocks.page_id AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );
```

---



---

## Auto-create Profile Trigger

Create a trigger to automatically create a profile when a user signs up:

```sql
-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, ai_usage_count, ai_usage_reset_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    0,
    NOW() + INTERVAL '1 month'  -- Reset usage monthly
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Monthly AI usage reset function (run via cron or Supabase Scheduler)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET ai_usage_count = 0,
      ai_usage_reset_at = NOW() + INTERVAL '1 month'
  WHERE ai_usage_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

VITE_GROQ_API_KEY=your-groq-api-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
VITE_STRIPE_SECRET_KEY=your-stripe-secret-key
```

**Security Note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Subscription & Billing Setup

### Stripe Integration
1. Create a Stripe account at https://stripe.com
2. Get publishable and secret keys from Developers → API keys
3. Create products in Stripe with the following price IDs:

| Plan | Price (per user/month) | Stripe Price ID |
|------|----------------------|-----------------|
| Free | $0 | (no price needed) |
| Pro | $15 | `price_xxx` |
| Business | $25 | `price_yyy` |
| Enterprise | Custom | Contact sales |

### Usage Limit Enforcement Function

Create a database function to check and enforce AI usage limits:

```sql
-- Check if workspace has exceeded AI usage limit
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_workspace_id UUID,
  p_feature TEXT,
  p_additional_requests INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_plan_limits JSONB := '{
    "free": {"monthly_requests": 10},
    "pro": {"monthly_requests": -1},
    "business": {"monthly_requests": -1},
    "enterprise": {"monthly_requests": -1}
  }'::jsonb;
  v_current_month_start TIMESTAMPTZ := date_trunc('month', NOW());
  v_used_this_month INTEGER;
  v_limit INTEGER;
  v_workspace_owner_id UUID;
BEGIN
  -- Get workspace tier and owner
  SELECT subscription_tier, owner_id INTO v_tier, v_workspace_owner_id
  FROM public.workspaces WHERE id = p_workspace_id;

  -- If pro/business/enterprise or owner, always allow
  IF v_tier IN ('pro', 'business', 'enterprise') OR v_workspace_owner_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Get limit for tier
  v_limit := (v_plan_limits->>v_tier)::INTEGER;

  -- Count usage this month
  SELECT COALESCE(SUM(request_count), 0) INTO v_used_this_month
  FROM public.ai_usage_logs
  WHERE workspace_id = p_workspace_id
    AND feature = p_feature
    AND created_at >= v_current_month_start;

  -- Check if limit exceeded
  IF v_limit > 0 AND (v_used_this_month + p_additional_requests) > v_limit THEN
    RETURN FALSE;  -- Limit exceeded
  END IF;

  RETURN TRUE;  -- Within limit
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log AI usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
  p_workspace_id UUID,
  p_user_id UUID,
  p_feature TEXT,
  p_tokens_used INTEGER DEFAULT 0,
  p_request_count INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.ai_usage_logs (
    workspace_id, user_id, feature, tokens_used, request_count
  ) VALUES (
    p_workspace_id, p_user_id, p_feature, p_tokens_used, p_request_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

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
