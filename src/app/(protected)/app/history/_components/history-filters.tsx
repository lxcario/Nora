"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PixelInput } from "@/components/pixel-ui";

interface Topic {
  id: string;
  name: string;
}

interface HistoryFiltersProps {
  topics: Topic[];
}

const typeOptions = [
  { value: "all", label: "All", icon: "Book.png" },
  { value: "feynman", label: "Feynman", icon: "Lightbulb.png" },
  { value: "video", label: "Video", icon: "Monitor.png" },
  { value: "research", label: "Research", icon: "MagnifyingGlass.png" },
] as const;

const dayOptions = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
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
          const isActive = currentType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParam("type", opt.value)}
              className="pixel-panel pixel-panel-inset inline-flex items-center gap-1.5 px-2.5 py-1.5 font-pixel text-[10px] transition-colors"
              style={{
                color: isActive ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--pixel-accent) 14%, var(--pixel-bg-surface))"
                  : undefined,
                borderColor: isActive ? "var(--pixel-accent)" : undefined,
              }}
            >
              <img
                src={`/sprites/travel-book/icons/${opt.icon}`}
                alt=""
                width={12}
                height={12}
                className="pixel-art"
              />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Topic dropdown */}
      <PixelInput
        type="select"
        value={currentTopic}
        onChange={(v) => updateParam("topic", v as string)}
        options={[
          { label: "All topics", value: "" },
          ...topics.map((t) => ({ label: t.name, value: t.id })),
        ]}
      />

      {/* Day range chips */}
      <div className="flex flex-wrap gap-1.5">
        {dayOptions.map((opt) => {
          const isActive = currentDays === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateParam("days", opt.value)}
              className="pixel-panel pixel-panel-inset px-2.5 py-1.5 font-pixel text-[10px] transition-colors"
              style={{
                color: isActive ? "var(--pixel-accent)" : "var(--pixel-text-secondary)",
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--pixel-accent) 14%, var(--pixel-bg-surface))"
                  : undefined,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
