"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code2,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { TimestampMark } from "./timestamp-mark";
import { saveNote } from "@/app/(protected)/app/_actions/study-room";
import { getNoteCompletion } from "@/app/(protected)/app/_actions/study-room/note-completion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  videoId: string;
  videoTitle: string;
  timeSegment: { start: number; end: number };
  initialContent?: string;
  onSeek: (seconds: number) => void;
  playerGetCurrentTime: () => number;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Component ───────────────────────────────────────────────────────────────

export function NoteEditor({
  videoId,
  videoTitle,
  timeSegment,
  initialContent,
  onSeek,
  playerGetCurrentTime,
}: NoteEditorProps) {
  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI completion state
  const [ghostText, setGhostText] = useState<string>("");
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string>("");

  // Initialize Tiptap editor with StarterKit + TimestampMark
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        codeBlock: {},
        bold: {},
        italic: {},
      }),
      TimestampMark.configure({
        onSeek,
        getCurrentTime: playerGetCurrentTime,
      }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-3 focus:outline-none",
      },
      handleClick: (_view, _pos, event) => {
        // Handle timestamp mark clicks
        const target = event.target as HTMLElement;
        const timestampEl = target.closest("[data-seconds]");
        if (timestampEl) {
          const seconds = parseFloat(
            timestampEl.getAttribute("data-seconds") || "0"
          );
          onSeek(seconds);
          return true;
        }
        return false;
      },
      handleKeyDown: (_view, event) => {
        // Tab to accept ghost text suggestion
        if (event.key === "Tab" && ghostText) {
          event.preventDefault();
          acceptGhostText();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      lastContentRef.current = text;

      // Clear ghost text on any edit
      setGhostText("");

      // Debounced auto-save (3 seconds)
      scheduleAutoSave(ed.getHTML(), text);

      // Schedule AI completion (2 seconds of inactivity)
      scheduleCompletion(text);
    },
  });

  // ─── Auto-Save Logic (3s debounce, 10s retry on failure) ─────────────────

  const doSave = useCallback(
    async (html: string, plainText: string) => {
      if (!videoId || !plainText.trim()) return;

      setSaveStatus("saving");

      const richContent = html ? { type: "html", content: html } : undefined;
      const result = await saveNote(
        videoId,
        timeSegment,
        plainText,
        richContent
      );

      if (result.error) {
        setSaveStatus("error");
        // Retry after 10 seconds
        retryTimerRef.current = setTimeout(() => {
          doSave(html, plainText);
        }, 10000);
      } else {
        setSaveStatus("saved");
        // Reset to idle after 2s
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
      }
    },
    [videoId, timeSegment]
  );

  const scheduleAutoSave = useCallback(
    (html: string, plainText: string) => {
      // Clear existing save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Clear retry timer on new edit
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      saveTimerRef.current = setTimeout(() => {
        doSave(html, plainText);
      }, 3000);
    },
    [doSave]
  );

  // ─── AI Inline Completion (2s inactivity) ─────────────────────────────────

  const scheduleCompletion = useCallback(
    (text: string) => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }

      // Only request completion if there's some content to continue from
      // and text is at least 10 chars (to avoid noisy suggestions)
      if (text.trim().length < 10) {
        return;
      }

      completionTimerRef.current = setTimeout(async () => {
        // Double check the text hasn't changed during the wait
        if (lastContentRef.current !== text) return;

        const result = await getNoteCompletion(videoTitle, text);
        // Only show if text still matches (user hasn't typed more)
        if (result.suggestion && lastContentRef.current === text) {
          setGhostText(result.suggestion);
        }
      }, 2000);
    },
    [videoTitle]
  );

  const acceptGhostText = useCallback(() => {
    if (!editor || !ghostText) return;

    // Insert the ghost text at the end of the document
    editor.chain().focus().insertContent(ghostText).run();
    setGhostText("");
  }, [editor, ghostText]);

  // ─── Insert AI-generated content ──────────────────────────────────────────

  /**
   * Insert AI-generated content at cursor position, or append to end.
   * Called externally when generated notes are produced.
   */
  const insertContent = useCallback(
    (content: string) => {
      if (!editor) return;

      const { from } = editor.state.selection;
      const docSize = editor.state.doc.content.size;

      if (from < docSize - 1) {
        // Insert at cursor
        editor.chain().focus().insertContent(content).run();
      } else {
        // Append to end
        editor
          .chain()
          .focus("end")
          .insertContent("\n\n" + content)
          .run();
      }
    },
    [editor]
  );

  // Expose insertContent via ref for parent components
  useEffect(() => {
    if (editor) {
      // Attach to the editor instance for external access
      (editor as unknown as { insertExternalContent: typeof insertContent }).insertExternalContent =
        insertContent;
    }
  }, [editor, insertContent]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!editor) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Toolbar */}
      <Toolbar editor={editor} saveStatus={saveStatus} />

      {/* Editor Content */}
      <div className="relative flex-1 overflow-y-auto">
        <EditorContent editor={editor} />

        {/* Ghost text overlay for AI suggestions */}
        {ghostText && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
            <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
              {ghostText}
            </p>
            <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-600">
              Press <kbd className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700">Tab</kbd> to accept
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Toolbar Component ───────────────────────────────────────────────────────

interface ToolbarProps {
  editor: Editor;
  saveStatus: SaveStatus;
}

function Toolbar({ editor, saveStatus }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-700">
      {/* Formatting Buttons */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Save Status Indicator */}
      <SaveIndicator status={saveStatus} />
    </div>
  );
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Save Status Indicator ───────────────────────────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  switch (status) {
    case "saving":
      return (
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </span>
      );
    case "saved":
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500">
          <Check className="h-3 w-3" />
          Saved
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500" title="Save failed. Retrying in 10s...">
          <AlertTriangle className="h-3 w-3" />
          Save failed
        </span>
      );
    default:
      return null;
  }
}
