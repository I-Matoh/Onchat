import { useState } from 'react';
import { db } from '@/api/supabaseAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calender';
import { Calendar as CalendarIcon, Clock, Users, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function CreateMeetingModal({ open, onClose, workspaceId, onCreated, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch workspace members for invite list (simplified: use profiles in workspace; in real app, we'd have workspace_members)
  // For now, we'll just add the creator as participant automatically

  const handleCreate = async () => {
    if (!title.trim() || !workspaceId) return;
    setLoading(true);

    const meeting = await db.entities.Meeting.create({
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
      duration_minutes: duration,
      auto_join_enabled: autoJoinEnabled,
      meeting_type: 'video',
      created_by: user?.id,
      participants_count: 1,
    });

    // Auto-add creator as participant
    await db.entities.MeetingParticipant.create({
      meeting_id: meeting.id,
      user_id: user?.id,
      email: user?.email || '',
      name: user?.full_name || user?.email,
      attended: false,
    });

    setLoading(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Team Standup, Sprint Planning..." className="mt-1" autoFocus />
          </div>

          <div>
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Meeting agenda..." className="mt-1 resize-none" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date & Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "w-full mt-1 flex items-center justify-start text-sm border border-input rounded-md px-3 py-2",
                      !scheduledAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledAt ? format(new Date(scheduledAt), 'PPP p') : <span>Pick date & time</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledAt ? new Date(scheduledAt) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                        const isoString = localDate.toISOString();
                        setScheduledAt(isoString);
                      }
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t border-border">
                    <Label className="text-xs mb-1 block">Time</Label>
                    <Input
                      type="time"
                      value={scheduledAt ? format(new Date(scheduledAt), 'HH:mm') : ''}
                      onChange={(e) => {
                        if (scheduledAt) {
                          const [hours, minutes] = e.target.value.split(':');
                          const d = new Date(scheduledAt);
                          d.setHours(parseInt(hours), parseInt(minutes));
                          setScheduledAt(d.toISOString());
                        }
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Duration (min)</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Auto-join enabled</span>
            </div>
            <button
              onClick={() => setAutoJoinEnabled(!autoJoinEnabled)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors",
                autoJoinEnabled ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
                autoJoinEnabled ? "left-5" : "left-0.5"
              )} />
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || loading} className="gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              {loading ? 'Scheduling...' : 'Schedule'}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
  );
}

