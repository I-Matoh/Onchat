import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '@/api/supabaseAdapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2, FileText, Sparkles, ArrowLeft, Plus, List, Table, Grid, Share2, Unlink, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import AIPageModal from '@/components/pages/AIPageModal';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Block-based Page Editor using TipTap
 * 
 * Features:
 * - Block-based editing (paragraphs, headings, lists, code, images)
 * - Drag & drop blocks via handles (future)
 * - Multiple view modes: document, kanban, table
 * - AI content enhancement
 * - Auto-save with debounce
 */
const PAGE_ICONS = ['📄', '📝', '🗒️', '📋', '📊', '🗃️', '🔖', '💡', '🎯', '🧠', '📅', '🗓️', '📁', '📂', '🗂️', '📰'];

const BLOCK_TYPES = [
  { value: 'paragraph', label: 'Text', icon: '📝' },
  { value: 'heading', label: 'Heading', icon: '🔤' },
  { value: 'bulletList', label: 'Bullet List', icon: '📋' },
  { value: 'orderedList', label: 'Numbered List', icon: '🔢' },
  { value: 'codeBlock', label: 'Code Block', icon: '</>' },
  { value: 'blockquote', label: 'Quote', icon: '💬' },
  { value: 'image', label: 'Image', icon: '🖼️' },
];

export default function PageEditor() {
  const { pageId } = useParams();
  const isNew = pageId === 'new';
  const { user, currentWorkspaceId } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('Untitled');
  const [icon, setIcon] = useState('📄');
  const [pageType, setPageType] = useState('doc');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [viewMode, setViewMode] = useState('document'); // document, kanban, table
  const [isPublic, setIsPublic] = useState(false);
  const [publicToken, setPublicToken] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: page } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => db.entities.Page.filter({ id: pageId }),
    enabled: !isNew && !!pageId,
    select: (data) => data[0],
  });

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use custom CodeBlock with language support
      }),
      Placeholder.configure({
        placeholder: 'Start writing something amazing... Press "/" for commands',
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true, allowBase64: true }),
      CodeBlock.configure({
        HTMLAttributes: { class: 'bg-muted p-4 rounded-lg overflow-x-auto' },
      }),
    ],
    content: page?.content || '<p></p>',
    onUpdate: ({ editor }) => {
      // Trigger auto-save
      if (!isNew) {
        handleAutoSave(editor.getJSON());
      }
    },
  });

  useEffect(() => {
    if (page && editor) {
      setTitle(page.title || 'Untitled');
      setIcon(page.icon || '📄');
      setPageType(page.page_type || 'doc');
      setIsPublic(page.is_public || false);
      setPublicToken(page.public_token || null);
      // Only set content if it's different to avoid cursor jump
      const currentJSON = editor.getJSON();
      if (JSON.stringify(currentJSON) !== JSON.stringify(page.content || {})) {
        editor.commands.setContent(page.content || '<p></p>');
      }
    }
  }, [page, editor]);

  const savePage = useCallback(async (contentJSON) => {
    if (!currentWorkspaceId || !editor) return;
    setSaving(true);

    const content = contentJSON || editor.getJSON();

    if (isNew) {
      const newPage = await db.entities.Page.create({
        workspace_id: currentWorkspaceId,
        title: title || 'Untitled',
        content,
        icon,
        page_type: pageType,
        last_edited_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['pages', currentWorkspaceId] });
      navigate(`/pages/${newPage.id}?w=${currentWorkspaceId}`, { replace: true });
    } else {
      await db.entities.Page.update(pageId, {
        title: title || 'Untitled',
        content,
        icon,
        page_type: pageType,
        last_edited_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['pages', currentWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
    }
    setLastSaved(new Date());
    setSaving(false);
  }, [pageId, title, icon, pageType, currentWorkspaceId, isNew, user, editor, navigate, queryClient]);

  const autoSaveTimerRef = useRef(null);
  const handleAutoSave = (content) => {
    if (isNew) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      savePage(content);
    }, 2000);
  };

  const handleSave = () => savePage();

  const handleDelete = async () => {
    if (!confirm('Delete this page?')) return;
    await db.entities.Page.update(pageId, { is_archived: true });
    queryClient.invalidateQueries({ queryKey: ['pages', currentWorkspaceId] });
    navigate(`/?w=${currentWorkspaceId}`);
  };

  const handleAIInsert = (text) => {
    if (editor) {
      editor.chain().focus().insertContent(`<p>${text}</p>`).run();
    }
    setShowAI(false);
  };

  const togglePublicSharing = async () => {
    if (isPublic) {
      // Disable sharing
      await db.entities.Page.update(pageId, { is_public: false });
      setIsPublic(false);
      setPublicToken(null);
    } else {
      // Enable sharing - ensure token exists
      if (!publicToken) {
        await db.entities.Page.update(pageId, { is_public: true });
      } else {
        await db.entities.Page.update(pageId, { is_public: true });
      }
      setIsPublic(true);
    }
    queryClient.invalidateQueries({ queryKey: ['page', pageId] });
  };

  const copyPublicLink = () => {
    if (publicToken) {
      const url = `${window.location.origin}/share/${publicToken}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // View mode-specific rendering
  const renderContent = () => {
    if (!editor) return null;

    if (viewMode === 'document') {
      return (
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} className="ProseMirror prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px]" />
        </div>
      );
    }

    if (viewMode === 'kanban') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {/* Kanban columns: Todo, In Progress, Done */}
          {['todo', 'in_progress', 'done'].map(status => (
            <div key={status} className="bg-muted/30 rounded-xl p-3 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                {status.replace('_', ' ')}
              </h3>
              <div className="space-y-2">
                {/* Each block becomes a card */}
                {editor.state.doc.content.content.map((node, idx) => (
                  <div key={idx} className="bg-card border border-border rounded-lg p-3 shadow-sm">
                    <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: node.textContent }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viewMode === 'table') {
      return (
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border px-4 py-2 text-left text-sm font-semibold text-muted-foreground">Content</th>
                <th className="border border-border px-4 py-2 text-left text-sm font-semibold text-muted-foreground">Type</th>
              </tr>
            </thead>
            <tbody>
              {editor.state.doc.content.content.map((node, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="border border-border px-4 py-2 text-sm">{node.textContent}</td>
                  <td className="border border-border px-4 py-2 text-sm text-muted-foreground capitalize">{node.type.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const typeLabels = { doc: '📝 Doc', database: '🗄️ Database', meeting_notes: '🎙️ Meeting Notes' };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('document')}
              className={cn("p-1.5 rounded text-xs", viewMode === 'document' ? "bg-background shadow-sm" : "text-muted-foreground")}
              title="Document"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn("p-1.5 rounded text-xs", viewMode === 'kanban' ? "bg-background shadow-sm" : "text-muted-foreground")}
              title="Kanban"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded text-xs", viewMode === 'table' ? "bg-background shadow-sm" : "text-muted-foreground")}
              title="Table"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {/* Block Insert */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Block
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-1">
                {BLOCK_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => {
                      if (editor) {
                        editor.chain().focus().insertContent(`<${type.value === 'image' ? 'img' : type.value}></${type.value === 'image' ? 'img' : type.value}>`).run();
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md"
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={() => setShowAI(true)} className="gap-1.5 text-primary">
            <Sparkles className="w-3.5 h-3.5" /> AI
          </Button>

          {/* Public Share Toggle */}
          <div className="relative">
            <button
              onClick={togglePublicSharing}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                isPublic
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              title={isPublic ? "Page is publicly shared" : "Share page publicly"}
            >
              {isPublic ? <Share2 className="w-3.5 h-3.5" /> : <Unlink className="w-3.5 h-3.5" />}
              {isPublic ? 'Shared' : 'Share'}
            </button>

            {/* Share link popover */}
            {isPublic && publicToken && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-10 p-2">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/share/${publicToken}`}
                    className="h-8 text-xs bg-muted"
                  />
                  <Button size="sm" variant="ghost" onClick={copyPublicLink} className="h-8 px-2">
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Anyone with the link can view this page
                </p>
              </div>
            )}
          </div>

          {!isNew && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {viewMode === 'document' ? (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
            {/* Icon & Type */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="text-4xl hover:bg-muted rounded-lg p-1 transition-colors"
                >
                  {icon}
                </button>
                {showIconPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-2 flex flex-wrap gap-1 z-10 w-48">
                    {PAGE_ICONS.map(i => (
                      <button
                        key={i}
                        onClick={() => { setIcon(i); setShowIconPicker(false); }}
                        className="text-xl p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                {Object.entries(typeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setPageType(type)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                      pageType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled"
              className="w-full text-4xl font-cal font-bold text-foreground bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 mb-6"
            />

            {/* TipTap Editor */}
            <div className="ProseMirror prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px]">
              {/* Custom toolbar */}
              <div className="sticky top-0 z-10 -mx-4 bg-background/95 backdrop-blur border-y border-border px-4 py-2 flex flex-wrap gap-1 mb-4">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn("px-2 py-1 rounded text-xs font-medium", editor?.isActive('bold') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  B
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn("px-2 py-1 rounded text-xs italic", editor?.isActive('italic') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  I
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={cn("px-2 py-1 rounded text-xs underline", editor?.isActive('underline') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  U
                </button>
                <div className="w-px h-6 bg-border mx-1" />
                {['h1', 'h2', 'h3', 'p'].map(level => (
                  <button
                    key={level}
                    onClick={() => editor.chain().focus().toggleHeading({ level: level === 'p' ? false : parseInt(level[1]) }).run()}
                    className={cn("px-2 py-1 rounded text-xs font-bold", editor?.isActive('heading', { level: level === 'p' ? false : parseInt(level[1]) }) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  >
                    {level === 'p' ? 'P' : level.toUpperCase()}
                  </button>
                ))}
                <div className="w-px h-6 bg-border mx-1" />
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={cn("px-2 py-1 rounded text-xs", editor?.isActive('bulletList') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  • List
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={cn("px-2 py-1 rounded text-xs", editor?.isActive('orderedList') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  1. List
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  className={cn("px-2 py-1 rounded text-xs font-mono", editor?.isActive('codeBlock') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  {'</>'}
                </button>
                <button
                  onClick={() => {
                    const url = window.prompt('Enter image URL:');
                    if (url) editor.chain().focus().setImage({ src: url }).run();
                  }}
                  className="px-2 py-1 rounded text-xs hover:bg-muted"
                >
                  🖼️
                </button>
              </div>

              {/* Actual editor content */}
              <EditorContent editor={editor} className="min-h-[500px]" />
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {showAI && (
        <AIPageModal
          pageTitle={title}
          pageContent={editor ? editor.getText() : ''}
          onClose={() => setShowAI(false)}
          onInsert={(text) => { editor?.commands.insertContent(`<p>${text}</p>`); setShowAI(false); }}
          workspaceId={currentWorkspaceId}
          user={user}
        />
      )}
    </div>
  );
}