"use client";

import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h2 className="font-pixel text-lg">Something went wrong</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
