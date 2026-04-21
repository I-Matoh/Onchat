import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

/**
 * AIAssistant - LLM-powered workspace assistant
 * 
 * Features:
 * - Context-aware responses using workspace data (pages, tasks)
 * - Chat-style UI with message history
 * - Markdown rendering for AI responses
 * - Quick action prompts for common tasks
 */

// Starter prompts shown when conversation is empty
const STARTER_PROMPTS = [
  'Summarize our recent conversations',
  'What tasks are overdue?',
  'Help me write meeting notes',
  'Draft a project status update',
  'Extract action items from recent discussions',
];

// Initial greeting message
const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your AI assistant. I can help you summarize documents, extract action items, answer questions about your workspace and more. What would you like to do?"
};

export default function AIAssistant() {
  // Workspace context from parent layout
  const { user, currentWorkspaceId } = useOutletContext();
  // Chat message history
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  // Current input text
  const [input, setInput] = useState('');
  // Loading state during AI response
  const [loading, setLoading] = useState(false);
  // Auto-scroll anchor
  const bottomRef = useRef(null);

  const { data: pages = [] } = useQuery({
    queryKey: ['pages', currentWorkspaceId],
    queryFn: () => db.entities.Page.filter({ workspace_id: currentWorkspaceId, is_archived: false }),
    enabled: !!currentWorkspaceId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => db.entities.Task.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const pagesSummary = pages
        .slice(0, 5)
        .map((page) => `- "${page.title}" (${page.page_type})`)
        .join('\n');
      const tasksSummary = tasks
        .filter((task) => task.status !== 'done')
        .slice(0, 10)
        .map((task) => `- "${task.title}" [${task.priority} priority, ${task.status}${task.assignee_email ? `, assigned to ${task.assignee_email}` : ''}]`)
        .join('\n');

      const systemContext = `You are an AI assistant for a team workspace called OneChat.
Workspace context:
Pages (${pages.length} total):
${pagesSummary || 'No pages yet'}

Open Tasks (${tasks.filter((task) => task.status !== 'done').length} total):
${tasksSummary || 'No open tasks'}

Current user: ${user?.full_name || user?.email}
Be concise, helpful and actionable. Format responses with markdown when helpful.`;

       const prompt = `${systemContext}\n\nConversation so far:\n${newMessages.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`).join('\n')}\n\nAssistant:`;
       const response = await db.integrations.Core.InvokeLLM(prompt, {
         workspaceId: currentWorkspaceId,
         userId: user?.id,
         feature: 'chat',
       });

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI assistant request failed:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error.message || 'The AI assistant could not complete that request.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by advanced AI</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([INITIAL_MESSAGE])}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Clear conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
              message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
            )}>
              {message.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm'
            )}>
              {message.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {message.content}
                </ReactMarkdown>
              ) : message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2 bg-muted/60 rounded-xl px-3 py-2 border border-border">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 text-sm resize-none min-h-0"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0 mb-0.5"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
