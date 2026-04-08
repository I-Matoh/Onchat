import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, User, Bot, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const STARTER_PROMPTS = [
  "Summarize our recent conversations",
  "What tasks are overdue?",
  "Help me write meeting notes",
  "Draft a project status update",
  "Extract action items from recent discussions",
];

export default function AIAssistant() {
  const { user, currentWorkspaceId } = useOutletContext();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI assistant. I can help you summarize documents, extract action items, answer questions about your workspace, and more. What would you like to do?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const { data: pages = [] } = useQuery({
    queryKey: ['pages', currentWorkspaceId],
    queryFn: () => base44.entities.Page.filter({ workspace_id: currentWorkspaceId, is_archived: false }),
    enabled: !!currentWorkspaceId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentWorkspaceId],
    queryFn: () => base44.entities.Task.filter({ workspace_id: currentWorkspaceId }),
    enabled: !!currentWorkspaceId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    // Build context
    const pagesSummary = pages.slice(0, 5).map(p => `- "${p.title}" (${p.page_type})`).join('\n');
    const tasksSummary = tasks.filter(t => t.status !== 'done').slice(0, 10).map(t =>
      `- "${t.title}" [${t.priority} priority, ${t.status}${t.assignee_email ? `, assigned to ${t.assignee_email}` : ''}]`
    ).join('\n');

    const systemContext = `You are an AI assistant for a team workspace called OneChat.
Workspace context:
Pages (${pages.length} total):
${pagesSummary || 'No pages yet'}

Open Tasks (${tasks.filter(t => t.status !== 'done').length} total):
${tasksSummary || 'No open tasks'}

Current user: ${user?.full_name || user?.email}
Be concise, helpful and actionable. Format responses with markdown when helpful.`;

    const prompt = `${systemContext}\n\nConversation so far:\n${newMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n\nAssistant:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          onClick={() => setMessages([{ role: 'assistant', content: "Hi! How can I help you today?" }])}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Clear conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === 'user' && "flex-row-reverse")}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
            )}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              msg.role === 'user'
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-card border border-border text-foreground rounded-tl-sm"
            )}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              ) : msg.content}
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

      {/* Starter prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {STARTER_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-3 py-1.5 bg-accent text-accent-foreground rounded-full hover:bg-accent/80 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2 bg-muted/60 rounded-xl px-3 py-2 border border-border">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
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