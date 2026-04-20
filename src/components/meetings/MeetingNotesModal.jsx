import { useState, useEffect } from 'react';
import { db } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Save, Sparkles, FileText, Clock, Users, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Card } from '@/components/ui/card';
import AIPageModal from '@/components/pages/AIPageModal';
import MeetingTranscriptView from './MeetingTranscriptView';

export default function MeetingNotesModal({ open, onClose, meeting, user, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [activeView, setActiveView] = useState('notes'); // notes, transcript, summary

  // Fetch meeting participants
  const { data: participants = [] } = useQuery({
    queryKey: ['meetingParticipants', meeting?.id],
    queryFn: () => db.entities.MeetingParticipant.filter({ meeting_id: meeting.id }),
    enabled: open && !!meeting?.id,
  });

  // TipTap editor for notes
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Take notes during the meeting...' })],
    content: meeting?.transcript || meeting?.notes || '',
    editable: !saved, // Lock after save
  });

  // Load content when meeting changes
  useEffect(() => {
    if (editor && meeting) {
      const content = meeting.transcript || meeting.notes || '';
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(JSON.parse(content || '{}'))) {
        editor.commands.setContent(content || '<p></p>');
      }
    }
  }, [meeting, editor, open]);

  const handleSave = async () => {
    if (!meeting || !editor) return;
    setSaving(true);
    const content = editor.getJSON();

    // Save as transcript (meeting notes)
    await db.entities.Meeting.update(meeting.id, {
      transcript: content,
      transcript_status: 'completed',
      ended_at: new Date().toISOString(),
    });

    setSaving(false);
    setSaved(true);
    onSaved?.();
    // After save, lock editor
    editor.setEditable(false);
  };

  const handleAIEnhance = () => setShowAI(true);

  const meetingDuration = meeting?.duration_minutes || 30;
  const attendees = participants.map(p => p.name || p.email).join(', ');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Meeting Notes: {meeting?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Meeting meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{meeting ? format(new Date(meeting.scheduled_at), 'PPpp') : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{participants.length} participants</span>
            </div>
            {saved && (
              <div className="flex items-center gap-1.5 text-green-600">
                <Award className="w-4 h-4" />
                <span>Saved successfully</span>
              </div>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
            {['notes', 'transcript', 'summary'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded transition-colors capitalize",
                  activeView === view ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/50"
                )}
              >
                {view === 'notes' ? '📝 Notes' : view === 'transcript' ? '📄 Transcript' : '✨ Summary'}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-background">
            {activeView === 'notes' && editor ? (
              <div className="p-4">
                <EditorContent editor={editor} className="ProseMirror prose prose-sm max-w-none min-h-[300px]" />
              </div>
            ) : activeView === 'transcript' ? (
              <MeetingTranscriptView meeting={meeting} />
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>AI Summary will appear here after processing</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => {/* Placeholder for AI summary generation */}}>
                  <Sparkles className="w-3.5 h-3.5" /> Generate Summary
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={handleAIEnhance} className="gap-1.5 text-primary">
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {!saved && (
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Notes'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* AI Modal */}
        {showAI && (
          <AIPageModal
            pageTitle={`Meeting: ${meeting?.title}`}
            pageContent={editor ? editor.getText() : ''}
            onClose={() => setShowAI(false)}
            onInsert={(text) => { editor?.commands.insertContent(`<p>${text}</p>`); setShowAI(false); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
