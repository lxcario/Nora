"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PenLine, MonitorPlay, FlaskConical, Layers } from "lucide-react";

interface Topic {
  id: string;
  name: string;
}

interface HistoryFiltersProps {
  topics: Topic[];
}

const typeOptions = [
  { value: "all", label: "All", icon: Layers },
  { value: "feynman", label: "Feynman", icon: PenLine },
  { value: "video", label: "Video Notes", icon: MonitorPlay },
  { value: "research", label: "Research", icon: FlaskConical },
] as const;

const dayOptions = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All time" },
] as const;

export function HistoryFilters({ topics }: HistoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "all";
  const currentTopic = searchParams.get("topic") ?? "";
  const currentDays = searchParams.get("days") ?? "all";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/app/history?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Type chips */}
      <div className="flex flex-wrap gap-1.5">
        {typeOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = currentType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParam("type", opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Topic dropdown */}
      <select
        value={currentTopic}
        onChange={(e) => updateParam("topic", e.target.value)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {/* Day range chips */}
      <div className="flex flex-wrap gap-1.5">
        {dayOptions.map((opt) => {
          const isActive = currentDays === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParam("days", opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
