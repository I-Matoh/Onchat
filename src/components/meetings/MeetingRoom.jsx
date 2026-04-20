import { useState } from 'react';
import { db } from '@/api/supabaseAdapter';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Phone, MessageSquare, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import MeetingNotesModal from './MeetingNotesModal';
import EmojiPicker from '@/components/chat/EmojiPicker';

export default function MeetingRoom({ meeting, user, onEnd }) {
  const queryClient = useQueryClient();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Fetch participants
  const { data: participants = [] } = useQuery({
    queryKey: ['meetingParticipants', meeting.id],
    queryFn: () => db.entities.MeetingParticipant.filter({ meeting_id: meeting.id }),
    enabled: !!meeting.id,
  });

  // End meeting
  const handleEnd = async () => {
    await db.entities.Meeting.update(meeting.id, {
      ended_at: new Date().toISOString(),
    });
    onEnd();
  };

  // Send chat message (could be meeting side chat)
  const sendMessage = async () => {
    if (!message.trim()) return;
    await db.entities.Message.create({
      conversation_id: meeting.id, // Could link meeting to a conversation
      workspace_id: meeting.workspace_id,
      sender_id: user.id,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      content: message.trim(),
      message_type: 'meeting_note',
    });
    setMessage('');
    queryClient.invalidateQueries({ queryKey: ['messages', meeting.id] });
  };

  // Toggle participant audio/video
  const toggleAudio = () => setAudioEnabled(!audioEnabled);
  const toggleVideo = () => setVideoEnabled(!videoEnabled);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <h2 className="font-semibold text-foreground">{meeting.title}</h2>
          <p className="text-xs text-muted-foreground">
            {meeting.description || 'No description'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </Badge>
          <Button size="sm" variant="destructive" onClick={handleEnd} className="gap-1.5">
            <Phone className="w-4 h-4 rotate-[135deg]" /> End
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 bg-black/5 dark:bg-white/5">
          {videoEnabled ? (
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Local user */}
              <Card className="bg-muted flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs">You</Badge>
                </div>
                <Video className="w-12 h-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">{user?.full_name || user?.email}</p>
              </Card>
              {/* Remote participants placeholder */}
              {participants.filter(p => p.email !== user.email).slice(0, 3).map(p => (
                <Card key={p.id} className="bg-muted flex flex-col items-center justify-center relative overflow-hidden">
                  {p.name ? (
                    <Avatar className="w-16 h-16">
                      <AvatarFallback className="text-xl">{p.name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Video className="w-12 h-12 text-muted-foreground/50" />
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">{p.name || p.email}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Camera is off</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Chat / Participants */}
        {showChat && (
          <div className="w-80 border-l border-border flex flex-col bg-background">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Meeting Chat</span>
              <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Placeholder messages */}
              <div className="text-center text-xs text-muted-foreground py-8">
                Chat messages will appear here
              </div>
            </div>
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="text-sm"
                />
                <Button size="sm" onClick={sendMessage} disabled={!message.trim()}>Send</Button>
              </div>
            </div>
          </div>
        )}

        {showParticipants && (
          <div className="w-64 border-l border-border flex flex-col bg-background">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Participants ({participants.length})</span>
              <button onClick={() => setShowParticipants(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {(p.name || p.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={audioEnabled ? "default" : "destructive"}
            onClick={toggleAudio}
            className="w-10 h-10 rounded-full"
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant={videoEnabled ? "default" : "destructive"}
            onClick={toggleVideo}
            className="w-10 h-10 rounded-full"
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Center - Meeting Timer and AI */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-mono">
              {new Date(meeting.scheduled_at ? new Date(meeting.scheduled_at) : Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={showChat ? "secondary" : "ghost"}
            onClick={() => setShowChat(!showChat)}
            className="w-10 h-10 rounded-full"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={showParticipants ? "secondary" : "ghost"}
            onClick={() => setShowParticipants(!showParticipants)}
            className="w-10 h-10 rounded-full"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-10 h-10 rounded-full"
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
}
