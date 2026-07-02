"use client";

import { useState, useTransition } from "react";
import { updateVideoTopic } from "@/app/(protected)/app/_actions/study-room";

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

export function TopicLinker({ topics, videoId, currentTopicId, onTopicChange }: TopicLinkerProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(currentTopicId);
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
        setSelectedTopicId(currentTopicId);
      } else {
        onTopicChange?.(topicId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-pixel text-[9px] uppercase" style={{ color: "var(--pixel-text-muted)" }}>
        Topic
      </label>
      <div className="relative">
        <select
          value={selectedTopicId ?? "none"}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="pixel-input block w-full text-sm disabled:opacity-50"
          style={{
            backgroundColor: "var(--pixel-bg-primary)",
            color: "var(--pixel-text-primary)",
            border: "2px solid var(--pixel-border)",
            padding: "6px 28px 6px 10px",
            appearance: "none",
          }}
        >
          <option value="none">None</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subjectName} → {t.name}
            </option>
          ))}
        </select>
        {isPending && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 font-pixel text-[9px] animate-pixel-blink"
            style={{ color: "var(--pixel-accent)" }}
          >
            ...
          </span>
        )}
      </div>
      {error && <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-error)" }}>{error}</p>}
    </div>
  );
}
