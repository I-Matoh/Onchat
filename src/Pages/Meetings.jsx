import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Users, Video, Mic, MicOff, VideoOff, Phone, Sparkles, Search, Play, Square, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import CreateMeetingModal from '@/components/meetings/CreateMeetingModal';
import MeetingRoom from '@/components/meetings/MeetingRoom';
import MeetingNotesModal from '@/components/meetings/MeetingNotesModal';

export default function Meetings() {
  const { user, currentWorkspaceId } = useOutletContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Fetch meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', currentWorkspaceId],
    queryFn: () => db.entities.Meeting.filter({ workspace_id: currentWorkspaceId }, 'scheduled_at', 100),
    enabled: !!currentWorkspaceId,
  });

  // Fetch participants for each meeting (simple approach: fetch all then group)
  const { data: allParticipants = [] } = useQuery({
    queryKey: ['meetingParticipants'],
    queryFn: () => db.entities.MeetingParticipant.list(),
    enabled: !!meetings.length,
  });

  const now = new Date();
  const filteredMeetings = meetings.filter(m => {
    if (filter === 'upcoming') return isAfter(new Date(m.scheduled_at), now) || m.scheduled_at === null;
    if (filter === 'past') return isBefore(new Date(m.scheduled_at), now) && m.ended_at;
    return true;
  });

  const upcomingMeetings = filteredMeetings.filter(m => isAfter(new Date(m.scheduled_at), now) || m.scheduled_at === null);
  const pastMeetings = filteredMeetings.filter(m => isBefore(new Date(m.scheduled_at), now) && m.ended_at);
  const inProgressMeetings = filteredMeetings.filter(m => !m.ended_at && isBefore(new Date(m.scheduled_at), addMinutes(now, 30)));

  const getParticipants = (meetingId) => {
    return allParticipants.filter(p => p.meeting_id === meetingId);
  };

  const handleJoin = (meeting) => {
    setSelectedMeeting(meeting);
    setShowJoin(true);
  };

  const handleStartNotes = (meeting) => {
    setSelectedMeeting(meeting);
    setShowNotes(true);
  };

  const handleMeetingEnd = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings', currentWorkspaceId] });
    setShowJoin(false);
    setSelectedMeeting(null);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl font-cal font-semibold text-foreground">Meetings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {meetings.length} total • {upcomingMeetings.length} upcoming • {pastMeetings.length} past
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="gap-1.5">
                  <CalendarIcon className="w-4 h-4" /> Schedule Meeting
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* In Progress Banner */}
        {inProgressMeetings.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">In Progress</h2>
            {inProgressMeetings.map(meeting => (
              <Card key={meeting.id} className="p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {formatDistanceToNow(new Date(meeting.scheduled_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleJoin(meeting)} className="gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Join
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStartNotes(meeting)} className="gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Notes
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'upcoming', 'past'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors",
                filter === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No meetings found</p>
            <p className="text-sm text-muted-foreground mb-4">Schedule your first meeting to get started</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <CalendarIcon className="w-4 h-4" /> Schedule Meeting
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeetings.map(meeting => {
              const participants = getParticipants(meeting.id);
              const isUpcoming = isAfter(new Date(meeting.scheduled_at), now);
              const isPast = meeting.ended_at || isBefore(new Date(meeting.scheduled_at), now);
              return (
                <Card key={meeting.id} className={cn("p-4 border hover:shadow-md transition-shadow", isPast && "opacity-70")}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isUpcoming ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" :
                        isPast ? "bg-muted text-muted-foreground" : "bg-green-50 text-green-600 dark:bg-green-500/10"
                      )}>
                        {isUpcoming ? <CalendarIcon className="w-5 h-5" /> : isPast ? <Clock className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), 'MMM d, h:mm a') : 'Not scheduled'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isUpcoming ? 'default' : 'secondary'} className="capitalize">
                      {isUpcoming ? 'Upcoming' : isPast ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>

                  {meeting.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{meeting.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{participants.length} attendees</span>
                    </div>
                    <div className="flex gap-2">
                      {isUpcoming && (
                        <Button size="sm" variant="outline" onClick={() => handleJoin(meeting)} className="gap-1.5">
                          <Video className="w-3.5 h-3.5" /> Join
                        </Button>
                      )}
                      {isPast && meeting.transcript && (
                        <Button size="sm" variant="ghost" onClick={() => handleStartNotes(meeting)} className="gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> View Notes
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
          <CreateMeetingModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            workspaceId={currentWorkspaceId}
            user={user}
            onCreated={() => { queryClient.invalidateQueries({ queryKey: ['meetings', currentWorkspaceId] }); setShowCreate(false); }}
          />

      {/* Join Meeting (Video) Modal */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Meeting Room
            </DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <MeetingRoom
              meeting={selectedMeeting}
              user={user}
              onEnd={handleMeetingEnd}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Notes Modal */}
      <MeetingNotesModal
        open={showNotes}
        onClose={() => { setShowNotes(false); setSelectedMeeting(null); }}
        meeting={selectedMeeting}
        user={user}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ['meetings', currentWorkspaceId] }); }}
      />
    </div>
  );
}
