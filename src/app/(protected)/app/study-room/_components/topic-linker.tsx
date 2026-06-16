"use client";

import { useState, useTransition } from "react";
import { updateVideoTopic } from "@/app/(protected)/app/_actions/study-room";
import { Loader2 } from "lucide-react";

export interface TopicOption {
  id: string;
  name: string;
  subjectName: string;
}

interface TopicLinkerProps {
  topics: TopicOption[];
  videoId: string;
  currentTopicId: string | null;
  onTopicChange?: (topicId: string | null) => void;
}

export function TopicLinker({
  topics,
  videoId,
  currentTopicId,
  onTopicChange,
}: TopicLinkerProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    currentTopicId
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    const topicId = value === "none" ? null : value;
    setSelectedTopicId(topicId);
    setError(null);

    startTransition(async () => {
      const result = await updateVideoTopic(videoId, topicId);
      if (result.error) {
        setError(result.error);
        // Revert on failure
        setSelectedTopicId(currentTopicId);
      } else {
        onTopicChange?.(topicId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Topic
      </label>
      <div className="relative">
        <select
          value={selectedTopicId ?? "none"}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="block w-full appearance-none rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 pr-8 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 disabled:opacity-50"
        >
          <option value="none">None</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subjectName} → {t.name}
            </option>
          ))}
        </select>
        {isPending && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
