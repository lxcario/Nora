"use client";

import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";

interface SendToFeynmanProps {
  selectedText: string;
  paperTitle?: string;
  researchQuestion?: string;
}

export function SendToFeynman({
  selectedText,
  paperTitle,
  researchQuestion,
}: SendToFeynmanProps) {
  const router = useRouter();

  const isValidLength =
    selectedText.length >= 10 && selectedText.length <= 500;

  function handleClick() {
    if (!isValidLength) return;

    const params = new URLSearchParams();
    params.set("topic", selectedText);
    if (paperTitle) {
      params.set("source", paperTitle);
    }
    if (researchQuestion) {
      params.set("context", researchQuestion);
    }

    router.push(`/app/feynman?${params.toString()}`);
  }

  return (
    <div className="relative inline-block group">
      <button
        onClick={handleClick}
        disabled={!isValidLength}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isValidLength
            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
            : "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
        }`}
      >
        <PenLine className="h-3.5 w-3.5" />
        Send to Feynman
      </button>

      {!isValidLength && (
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
          Selection must be 10–500 characters
        </span>
      )}
    </div>
  );
}
