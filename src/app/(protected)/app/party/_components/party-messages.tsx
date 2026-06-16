"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { PartyMessageView } from "../../_actions/party";
import { sendMessage } from "../../_actions/party-social";

// ─── Types ──────────────────────────────────────────────────────────

interface PartyMessagesProps {
  messages: PartyMessageView[];
}

// ─── Utilities ──────────────────────────────────────────────────────

/**
 * formatRelativeTime — converts an ISO timestamp string to a human-friendly
 * relative time label (e.g., "2m ago", "3h ago", "yesterday").
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  // Fallback for older messages
  return new Date(isoString).toLocaleDateString();
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 200;

// ─── Component ──────────────────────────────────────────────────────

/**
 * PartyMessages — displays recent party messages and provides a send form.
 *
 * Features:
 * - Displays 20 most recent messages (passed in sorted from server, newest first)
 * - Each message shows sender display name (bold), content, and relative timestamp
 * - Message input form with character counter (X/200) and Send button
 * - Error display for rate limit and blocked content
 * - Empty state when no messages exist
 *
 * Requirements: 8.1, 8.3, 8.4
 */
export function PartyMessages({ messages }: PartyMessagesProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || isOverLimit || sending) return;

    setSending(true);
    setError(null);

    const result = await sendMessage(content);

    if (result.error) {
      setError(result.error);
      setSending(false);
    } else {
      setContent("");
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      {/* Message Feed */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No messages yet. Start a conversation!
          </p>
        </div>
      ) : (
        <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {msg.senderName}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {formatRelativeTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {error && (
          <p className="mb-2 text-xs text-red-500">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message…"
              maxLength={250}
              disabled={sending}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
            <div className="mt-1 flex justify-end">
              <span
                className={`text-xs ${
                  isOverLimit
                    ? "text-red-500"
                    : charCount > MAX_MESSAGE_LENGTH * 0.8
                    ? "text-amber-500"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={isEmpty || isOverLimit || sending}
            className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
