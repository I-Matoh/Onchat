import { useState } from 'react';
import { db } from '@/api/supabaseAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Summarize', prompt: 'Summarize the following content concisely:' },
  { label: 'Extract Action Items', prompt: 'Extract all action items from the following content as a bullet list:' },
  { label: 'Improve Writing', prompt: 'Improve the writing quality and clarity of:' },
  { label: 'Generate Outline', prompt: 'Generate a structured outline based on:' },
];

export default function AIPageModal({ pageTitle, pageContent, onClose, onInsert }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const runAI = async (promptText) => {
    const fullPrompt = `${promptText}\n\nPage Title: ${pageTitle}\n\nContent: ${pageContent || '(empty page)'}`;
    setLoading(true);
    setResult('');
    const res = await db.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    setResult(res);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-primary" /> AI Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => runAI(a.prompt)}
                className="text-xs px-3 py-1.5 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/80 transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Custom Prompt */}
          <div>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask AI anything about this page..."
              className="resize-none"
              rows={2}
            />
            <Button
              className="mt-2 w-full gap-1.5"
              onClick={() => runAI(prompt)}
              disabled={!prompt.trim() || loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Thinking...' : 'Ask AI'}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-muted/60 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto scrollbar-thin">
              {result}
            </div>
          )}

          {result && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button size="sm" onClick={() => onInsert(result)} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Insert into Page
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}