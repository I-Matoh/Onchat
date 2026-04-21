import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export default function MeetingTranscriptView({ meeting }) {
  // Placeholder: In the future, this would render actual transcript with speaker diarization
  const transcript = meeting?.transcript ? JSON.parse(meeting.transcript) : null;

  if (!transcript) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No transcript available yet.</p>
          <p className="text-sm">Take notes during the meeting using the Notes tab.</p>
        </div>
      </div>
    );
  }

  // Parse TipTap JSON into readable transcript segments (placeholder implementation)
  // In production, this would be structured speaker-timestamp data
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Transcript coming soon with speaker detection</span>
      </div>

      {/* Placeholder: render notes as transcript-like */}
      <div className="space-y-2">
        {transcript.content?.map((block, idx) => (
          <Card key={idx} className="p-3 border-border/50">
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">AI Assistant</span>
                  <Badge variant="outline" className="text-xs">Note</Badge>
                </div>
                <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: block.content || block.text || '' }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
