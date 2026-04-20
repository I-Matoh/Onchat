import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['📌', '📍', '🎯', '✅', '❌', '❓', '❗', '💡', '🔥', '✨', '⭐', '🌟', '💫', '📎', '📏', '📐', '✂️', '🔒', '🔓', '🔑', '🗝️', '📝', '✏️', '🖊️', '🖋️', '📁', '📂', '🗂️', '📇', '📄', '📃', '🧾'],
  'Symbols': ['👍', '👎', '👏', '🙏', '💪', '🧠', '👀', '👂', '👃', '👄', '💋', '🩸', '💀', '💩', '🔥', '✨', '🎉', '🎊', '🏆', '🥇', '🥈', '🥉', '⚡', '💯', '🔝', '🚀', '📈', '💻', '⌨️', '🖥️', '🖱️', '🖨️'],
};

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState('Smileys');
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory] || [];

  return (
    <div
      ref={pickerRef}
      className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 w-72"
    >
      {/* Search */}
      <div className="p-2 border-b border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-2 py-1.5 text-sm bg-muted rounded-md border-0 focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-border px-1 py-1 gap-1 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2 py-1 text-sm rounded-md shrink-0 transition-colors",
                activeCategory === cat ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {filteredEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-muted transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
