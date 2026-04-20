import { cn } from '@/lib/utils';

export default function ReactionBadge({ emoji, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
        active
          ? "bg-primary/10 border-primary text-primary"
          : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
      )}
    >
      <span>{emoji}</span>
      {count > 1 && <span className="text-[10px] font-medium">{count}</span>}
    </button>
  );
}
