import { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Hash, Plus, Send, MessageSquare, Users, Reply, X, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateConversationModal from '@/components/chat/CreateConversationModal';
import EmojiPicker from '@/components/chat/EmojiPicker';
import ReactionBadge from '@/components/chat/ReactionBadge';

/**
 * Chat - Real-time messaging interface with threaded replies
 * 
 * Features:
 * - Channel sidebar with conversation list
 * - Threaded message replies (Slack-like)
 * - Real-time updates via Supabase subscriptions
 * - Message reactions with emoji picker
 * - Optimistic UI for instant feedback
 * - Visual thread connectors for nested replies
 */
export default function Chat() {
  const { user, currentWorkspaceId } = useOutletContext();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, sender_name, content }
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentWorkspaceId],
    queryFn: () => db.entities.Conversation.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  // Fetch all messages and build thread tree
  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: async () => {
      const msgs = await db.entities.Message.filter({ conversation_id: selectedConvId }, 'created_date', 500);
      return msgs;
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  // Fetch reactions for all messages in this conversation
  const { data: reactions = [] } = useQuery({
    queryKey: ['reactions', selectedConvId],
    queryFn: async () => {
      if (!allMessages.length) return [];
      const messageIds = allMessages.map(m => m.id);
      // Fetch all reactions for messages in this conversation
      const allReactions = await db.entities.Reaction.list();
      return allReactions.filter(r => messageIds.includes(r.message_id));
    },
    enabled: !!selectedConvId && allMessages.length > 0,
    refetchInterval: 3000,
  });

  // Build thread hierarchy: top-level messages with replies array
  const { topLevelMessages } = useMemo(() => {
    const messageMap = new Map();
    const roots = [];

    // First pass: create map with reactions attached
    allMessages.forEach(msg => {
      const msgReactions = reactions.filter(r => r.message_id === msg.id);
      messageMap.set(msg.id, { ...msg, replies: [], reactions: msgReactions });
    });

    // Second pass: build tree
    allMessages.forEach(msg => {
      const node = messageMap.get(msg.id);
      if (msg.parent_message_id) {
        const parent = messageMap.get(msg.parent_message_id);
        if (parent) {
          parent.replies.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Sort roots by date, sort replies within each parent
    roots.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    roots.forEach(root => {
      root.replies.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    });

    return { topLevelMessages: roots };
  }, [allMessages, reactions]);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [topLevelMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedConvId) return;
    const unsub = db.entities.Message.subscribe((event) => {
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
    const parentId = replyingTo?.id;
    setReplyingTo(null);

    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      conversation_id: selectedConvId,
      workspace_id: currentWorkspaceId,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content: text,
      message_type: 'text',
      parent_message_id: parentId || null,
      created_date: new Date().toISOString(),
    };
    queryClient.setQueryData(['messages', selectedConvId], (old = []) => [...old, optimisticMsg]);

    await db.entities.Message.create({
      conversation_id: selectedConvId,
      workspace_id: currentWorkspaceId,
      sender_email: user?.email,
      sender_name: user?.full_name || user?.email,
      content: text,
      message_type: 'text',
      parent_message_id: parentId || null,
    });

    if (!parentId) {
      await db.entities.Conversation.update(selectedConvId, {
        last_message: text,
        last_message_at: new Date().toISOString(),
      });
    }

    queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    queryClient.invalidateQueries({ queryKey: ['conversations', currentWorkspaceId] });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleThread = (msgId) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleAddReaction = async (messageId, emoji) => {
    try {
      await db.entities.Reaction.create({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const handleRemoveReaction = async (messageId, emoji) => {
    try {
      const { data: reactions } = await db.entities.Reaction.filter({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
      if (reactions.length > 0) {
        await db.entities.Reaction.delete(reactions[0].id);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
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
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              {topLevelMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {topLevelMessages.map(msg => (
                    <MessageNode
                      key={msg.id}
                      msg={msg}
                      isMe={msg.sender_email === user?.email}
                      userEmail={user?.email}
                      onReply={setReplyingTo}
                      onToggleThread={toggleThread}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                      threadExpanded={expandedThreads.has(msg.id)}
                      depth={0}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2 border border-border">
                {replyingTo && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
                    <Reply className="w-3 h-3" />
                    <span>Replying to {replyingTo.sender_name}</span>
                    <button onClick={() => setReplyingTo(null)} className="hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyingTo ? `Reply to ${replyingTo.sender_name}...` : `Message #${selectedConv.name}`}
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

function MessageNode({ msg, isMe, userEmail, onReply, onToggleThread, onAddReaction, onRemoveReaction, threadExpanded, depth }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const hasReplies = msg.replies && msg.replies.length > 0;

  // Count reaction occurrences from msg.reactions
  const reactionCounts = useMemo(() => {
    const counts = {};
    (msg.reactions || []).forEach(r => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  }, [msg.reactions]);

  const handleReaction = (emoji) => {
    if (msg.reactions?.some(r => r.emoji === emoji && r.user_id === userEmail)) {
      onRemoveReaction(msg.id, emoji);
    } else {
      onAddReaction(msg.id, emoji);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(msg.created_date), { addSuffix: true });

  return (
    <div className={cn("flex gap-3 group", isMe && "flex-row-reverse", depth > 0 && "ml-8 pl-4 border-l-2 border-border/50")}>
      <Avatar className={cn("w-7 h-7 shrink-0 mt-0.5", depth > 0 && "w-6 h-6")}>
        <AvatarFallback className={cn("text-xs font-semibold", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {(msg.sender_name || msg.sender_email)?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex-1 min-w-0", isMe && "items-end flex flex-col")}>
        <div className={cn("flex items-baseline gap-2 mb-0.5", isMe && "flex-row-reverse")}>
          <span className="text-xs font-semibold text-foreground">{msg.sender_name || msg.sender_email}</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm leading-relaxed inline-block max-w-fit",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        )}>
          {msg.content}
        </div>

        {/* Reactions */}
        {reactionCounts && Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <ReactionBadge
                key={emoji}
                emoji={emoji}
                count={count}
                active={reactions.some(r => r.emoji === emoji && r.user_id === userEmail)}
                onClick={() => handleReaction(emoji)}
              />
            ))}
          </div>
        )}

        {/* Message actions */}
        <div className={cn("flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity", isMe && "flex-row-reverse")}>
          <button
            onClick={() => onReply(msg)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Reply className="w-3 h-3" />
            Reply
          </button>
          {hasReplies && (
            <button
              onClick={() => onToggleThread(msg.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {threadExpanded ? 'Hide' : 'Show'} {msg.replies.length} {msg.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            React
          </button>
        </div>

        {/* Reaction picker */}
        {showReactionPicker && (
          <EmojiPicker
            onSelect={(emoji) => {
              handleReaction(emoji);
              setShowReactionPicker(false);
            }}
            onClose={() => setShowReactionPicker(false)}
          />
        )}

        {/* Thread replies */}
        {hasReplies && threadExpanded && (
          <div className="mt-2 space-y-2">
            {msg.replies.map(reply => (
              <MessageNode
                key={reply.id}
                msg={reply}
                isMe={reply.sender_email === userEmail}
                userEmail={userEmail}
                onReply={onReply}
                onToggleThread={onToggleThread}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
                threadExpanded={false}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}