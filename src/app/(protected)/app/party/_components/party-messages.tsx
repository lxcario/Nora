"use client";

import { useState } from "react";
import type { PartyMessageView } from "../../_actions/party";
import { sendMessage } from "../../_actions/party-social";
import { PixelButton } from "@/components/pixel-ui";

// ─── Utilities ──────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 0) return "just now";
  const s = Math.floor(diffMs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (s < 60) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString();
}

const MAX_MESSAGE_LENGTH = 200;

// ─── Component ──────────────────────────────────────────────────────

interface PartyMessagesProps {
  messages: PartyMessageView[];
}

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
    } else {
      setContent("");
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      {/* Message Feed */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <img
            src="/sprites/travel-book/icons/Team.png"
            alt=""
            width={32}
            height={32}
            className="pixel-art opacity-50"
          />
          <p className="text-sm" style={{ color: "var(--pixel-text-muted)" }}>
            No messages yet. Start a conversation!
          </p>
        </div>
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div key={msg.id} className="pixel-panel pixel-panel-inset" style={{ padding: "var(--pixel-panel-compact)" }}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-pixel text-[11px]" style={{ color: "var(--pixel-accent)" }}>
                  {msg.senderName}
                </span>
                <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                  {formatRelativeTime(msg.createdAt)}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--pixel-text-primary)", lineHeight: 1.5 }}>
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-2"
        style={{ borderTop: "2px solid var(--pixel-border)", paddingTop: "12px" }}
      >
        {error && (
          <p className="font-pixel text-[10px]" style={{ color: "var(--pixel-error)" }}>
            {error}
          </p>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type a message…"
              maxLength={250}
              disabled={sending}
              className="pixel-input w-full text-sm"
              style={{
                backgroundColor: "var(--pixel-bg-primary)",
                color: "var(--pixel-text-primary)",
                border: "2px solid var(--pixel-border)",
                padding: "8px 12px",
              }}
            />
            <div className="flex justify-end">
              <span
                className="font-pixel text-[9px]"
                style={{
                  color: isOverLimit
                    ? "var(--pixel-error)"
                    : charCount > MAX_MESSAGE_LENGTH * 0.8
                    ? "var(--pixel-warning)"
                    : "var(--pixel-text-muted)",
                }}
              >
                {charCount}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          <PixelButton
            type="submit"
            variant="primary"
            disabled={isEmpty || isOverLimit || sending}
            loading={sending}
          >
            Send →
          </PixelButton>
        </div>
      </form>
    </div>
  );
}
