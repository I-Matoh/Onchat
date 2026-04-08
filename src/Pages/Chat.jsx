import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hash, Plus, Send, MessageSquare, Users } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateConversationModal from '@/components/chat/CreateConversationModal';

/**
 * Chat - Real-time messaging interface with channel support
 * 
 * This component provides a Slack-like chat experience with:
 * - Channel sidebar listing all conversations in the workspace
 * - Real-time message display with optimistic updates
 * - Supabase realtime subscriptions for live message updates
 * - Support for both public channels and direct messages
 * 
 * Key features:
 * - Auto-select first channel on load
 * - Auto-scroll to newest messages
 * - Optimistic UI updates for instant message feedback
 * - Grouped message bubbles for consecutive messages from same user
 * - Polling fallback (3s interval) alongside realtime subscription
 */
export default function Chat() {
  const { user, currentWorkspaceId } = useOutletContext();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentWorkspaceId],
    queryFn: () => base44.entities.Conversation.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConvId }, 'created_date', 100),
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedConvId) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === selectedConvId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      }
    });
    return unsub;
  }, [selectedConvId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConvId || sending) return;
    setSending(true);
    const text = messageText.trim();
    setMessageText('');

    // Optimistic update — add message immediately
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedConvId,
      workspace_id: currentWorkspaceId,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content: text,
      message_type: 'text',
      created_date: new Date().toISOString(),
    };
    queryClient.setQueryData(['messages', selectedConvId], (old = []) => [...old, optimisticMsg]);

    await base44.entities.Message.create({
      conversation_id: selectedConvId,
      workspace_id: currentWorkspaceId,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content: text,
      message_type: 'text',
    });
    await base44.entities.Conversation.update(selectedConvId, {
      last_message: text,
      last_message_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    queryClient.invalidateQueries({ queryKey: ['conversations', currentWorkspaceId] });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-44 sm:w-56 border-r border-border bg-muted/30 flex flex-col shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Channels</span>
          <button
            onClick={() => setShowCreate(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2 text-center">No channels yet</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
                  selectedConvId === conv.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {conv.type === 'direct' ? <Users className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{conv.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Hash className="w-4.5 h-4.5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{selectedConv.name}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_email === user?.email;
                  const prevMsg = messages[i - 1];
                  const sameAuthor = prevMsg?.sender_email === msg.sender_email &&
                    (new Date(msg.created_date) - new Date(prevMsg.created_date)) < 300000;
                  return (
                    <MessageBubble key={msg.id} msg={msg} isMe={isMe} compact={sameAuthor} />
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 border border-border">
                <Input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${selectedConv.name}`}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sending}
                  className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Select a channel to start chatting</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Create Channel
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateConversationModal
          workspaceId={currentWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(conv) => { setSelectedConvId(conv.id); setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['conversations', currentWorkspaceId] }); }}
        />
      )}
    </div>
  );
}

function MessageBubble({ msg, isMe, compact }) {
  return (
    <div className={cn("flex gap-3 group", isMe && "flex-row-reverse")}>
      {!compact ? (
        <Avatar className="w-8 h-8 shrink-0 mt-0.5">
          <AvatarFallback className={cn("text-xs font-semibold", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className={cn("max-w-[70%]", isMe && "items-end flex flex-col")}>
        {!compact && (
          <div className={cn("flex items-baseline gap-2 mb-1", isMe && "flex-row-reverse")}>
            <span className="text-xs font-semibold text-foreground">{msg.sender_name || msg.sender_email}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(msg.created_date), 'HH:mm')}</span>
          </div>
        )}
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm leading-relaxed",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        )}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}