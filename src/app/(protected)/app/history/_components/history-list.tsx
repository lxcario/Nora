"use client";

import { useState } from "react";
import { PenLine, MonitorPlay, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import type { HistoryItem } from "../../_actions/history";

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

function TypeBadge({ type }: { type: HistoryItem["type"] }) {
  const config = {
    feynman: {
      label: "Feynman",
      icon: PenLine,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    video: {
      label: "Video",
      icon: MonitorPlay,
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    research: {
      label: "Research",
      icon: FlaskConical,
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    },
  }[type];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function GapDots({ summary }: { summary: { green: number; amber: number; red: number } }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {summary.green > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-zinc-500">{summary.green}</span>
        </span>
      )}
      {summary.amber > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500">{summary.amber}</span>
        </span>
      )}
      {summary.red > 0 && (
        <span className="flex items-center gap-0.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-zinc-500">{summary.red}</span>
        </span>
      )}
    </span>
  );
}

function HistoryItemCard({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type} />
            {item.topicName && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.topicName}
              </span>
            )}
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatTime(item.date)}
            </span>
          </div>

          {/* Type-specific header */}
          <div className="mt-1.5">
            {item.type === "feynman" && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {item.preview}…
                </p>
                {item.gapSummary && <GapDots summary={item.gapSummary} />}
              </div>
            )}
            {item.type === "video" && (
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {item.videoTitle}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {item.preview}…
                  {item.timeSegment && (
                    <span className="ml-2 text-zinc-400">⏱ {item.timeSegment}</span>
                  )}
                </p>
              </div>
            )}
            {item.type === "research" && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {item.preview}
                {item.durationMinutes && (
                  <span className="ml-2 text-xs text-zinc-400">
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
            className="flex-shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && item.fullText && (
        <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {item.fullText}
          </p>
          {item.aiSummary && (
            <div className="mt-2 rounded-md bg-zinc-50 p-2 dark:bg-zinc-800/50">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">AI Summary</p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                {item.aiSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <PenLine className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm font-medium text-zinc-500">No history yet</p>
        <p className="mt-1 text-center text-xs text-zinc-400 max-w-xs">
          Start studying with Feynman mode, watch videos, or do research — your activity will show up here.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(items);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
        <section key={dateLabel}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
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
