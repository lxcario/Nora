"use client";

import { Globe, FileText } from "lucide-react";

interface ResearchModeToggleProps {
  mode: "web" | "papers";
  onModeChange: (mode: "web" | "papers") => void;
}

export function ResearchModeToggle({ mode, onModeChange }: ResearchModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
      <button
        onClick={() => onModeChange("web")}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
          mode === "web"
            ? "bg-indigo-600 font-bold text-white shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <Globe className="h-4 w-4" />
        From web sources
      </button>
      <button
        onClick={() => onModeChange("papers")}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
          mode === "papers"
            ? "bg-indigo-600 font-bold text-white shadow-sm"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        <FileText className="h-4 w-4" />
        From your papers
      </button>
    </div>
  );
}
