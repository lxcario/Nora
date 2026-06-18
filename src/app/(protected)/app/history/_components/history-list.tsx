"use client";

import { useState } from "react";
import type { HistoryItem } from "../../_actions/history";
import { EmptyState } from "@/components/pixel-ui";

interface HistoryListProps {
  items: HistoryItem[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupByDate(items: HistoryItem[]): Map<string, HistoryItem[]> {
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const key = new Date(item.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Type badge config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  feynman: { label: "Feynman", icon: "Lightbulb.png", color: "var(--pixel-success)" },
  video: { label: "Video", icon: "Monitor.png", color: "var(--pixel-accent)" },
  research: { label: "Research", icon: "MagnifyingGlass.png", color: "#8b5cf6" },
};

function TypeBadge({ type }: { type: HistoryItem["type"] }) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;

  return (
    <span
      className="pixel-panel pixel-panel-inset inline-flex items-center gap-1 px-2 py-0.5 font-pixel text-[9px]"
      style={{ color: config.color }}
    >
      <img
        src={`/sprites/travel-book/icons/${config.icon}`}
        alt=""
        width={10}
        height={10}
        className="pixel-art"
      />
      {config.label}
    </span>
  );
}

function GapDots({ summary }: { summary: { green: number; amber: number; red: number } }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {summary.green > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2" style={{ backgroundColor: "var(--pixel-success)" }} />
          <span style={{ color: "var(--pixel-text-muted)" }}>{summary.green}</span>
        </span>
      )}
      {summary.amber > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2" style={{ backgroundColor: "var(--pixel-warning)" }} />
          <span style={{ color: "var(--pixel-text-muted)" }}>{summary.amber}</span>
        </span>
      )}
      {summary.red > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2" style={{ backgroundColor: "var(--pixel-error)" }} />
          <span style={{ color: "var(--pixel-text-muted)" }}>{summary.red}</span>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HistoryItemCard
// ---------------------------------------------------------------------------

function HistoryItemCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="pixel-panel" style={{ padding: "12px 16px" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            {item.topicName && (
              <span className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                {item.topicName}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
              {formatTime(item.date)}
            </span>
          </div>

          {/* Type-specific header */}
          <div className="mt-1.5">
            {item.type === "feynman" && (
              <div className="flex items-center gap-2">
                <p className="text-sm truncate" style={{ color: "var(--pixel-text-primary)" }}>
                  {item.preview}…
                </p>
                {item.gapSummary && <GapDots summary={item.gapSummary} />}
              </div>
            )}
            {item.type === "video" && (
              <div>
                <p className="text-sm font-medium truncate" style={{ color: "var(--pixel-text-primary)" }}>
                  {item.videoTitle}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--pixel-text-secondary)" }}>
                  {item.preview}…
                  {item.timeSegment && (
                    <span className="ml-2" style={{ color: "var(--pixel-text-muted)" }}>
                      ⏱ {item.timeSegment}
                    </span>
                  )}
                </p>
              </div>
            )}
            {item.type === "research" && (
              <p className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
                {item.preview}
                {item.durationMinutes && (
                  <span className="ml-2 text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                    {item.durationMinutes} min
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {item.fullText && item.fullText.length > 100 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-1 font-pixel text-[10px] transition-colors"
            style={{ color: "var(--pixel-text-secondary)" }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && item.fullText && (
        <div className="mt-3 pt-3" style={{ borderTop: "2px solid var(--pixel-border)" }}>
          <p
            className="whitespace-pre-wrap text-sm"
            style={{ color: "var(--pixel-text-secondary)", lineHeight: 1.6 }}
          >
            {item.fullText}
          </p>
          {item.aiSummary && (
            <div
              className="mt-2 p-2"
              style={{ backgroundColor: "var(--pixel-bg-secondary)", border: "1px solid var(--pixel-border)" }}
            >
              <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                AI Summary
              </p>
              <p className="mt-0.5 text-sm" style={{ color: "var(--pixel-text-primary)" }}>
                {item.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryList
// ---------------------------------------------------------------------------

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="pen"
        message="No history yet. Start studying with Feynman mode, watch videos, or do research — your activity will show up here."
        actionLabel="Feynman Mode"
        actionHref="/app/feynman"
      />
    );
  }

  const grouped = groupByDate(items);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
        <section key={dateLabel}>
          <h3
            className="mb-2 font-pixel text-[10px] uppercase tracking-wider"
            style={{ color: "var(--pixel-text-muted)" }}
          >
            {dateLabel}
          </h3>
          <div className="space-y-2">
            {dateItems.map((item) => (
              <HistoryItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
