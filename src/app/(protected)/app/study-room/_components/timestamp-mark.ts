"use client";

import { Mark, mergeAttributes } from "@tiptap/core";

export interface TimestampMarkOptions {
  HTMLAttributes: Record<string, unknown>;
  onSeek: (seconds: number) => void;
  getCurrentTime: () => number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    timestamp: {
      /**
       * Insert a timestamp mark at the current cursor position
       */
      insertTimestamp: (seconds: number) => ReturnType;
    };
  }
}

/**
 * Custom Tiptap Mark extension for clickable timestamp badges.
 *
 * Renders an inline [MM:SS] badge that, when clicked, seeks the
 * video player to the associated time offset.
 *
 * Requirements: 5.2, 5.3
 */
export const TimestampMark = Mark.create<TimestampMarkOptions>({
  name: "timestamp",

  addOptions() {
    return {
      HTMLAttributes: {
        class:
          "timestamp-mark inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-mono cursor-pointer hover:bg-indigo-200 transition-colors dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60",
      },
      onSeek: () => {},
      getCurrentTime: () => 0,
    };
  },

  addAttributes() {
    return {
      seconds: {
        default: 0,
        parseHTML: (el) => parseFloat(el.getAttribute("data-seconds") || "0"),
        renderHTML: (attrs) => ({ "data-seconds": attrs.seconds }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-seconds]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const seconds = Number(HTMLAttributes["data-seconds"] || 0);
    const formatted = formatSecondsDisplay(seconds);

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-seconds": seconds,
        title: `Jump to ${formatted}`,
      }),
      formatted,
    ];
  },

  addCommands() {
    return {
      insertTimestamp:
        (seconds: number) =>
        ({ chain }) => {
          const formatted = formatSecondsDisplay(seconds);
          return chain()
            .insertContent({
              type: "text",
              marks: [
                {
                  type: this.name,
                  attrs: { seconds },
                },
              ],
              text: formatted,
            })
            .insertContent(" ")
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-t": () => {
        const seconds = this.options.getCurrentTime();
        return this.editor.commands.insertTimestamp(seconds);
      },
    };
  },
});

/**
 * Formats seconds into MM:SS or H:MM:SS display string.
 */
function formatSecondsDisplay(totalSeconds: number): string {
  const s = Math.floor(Math.max(0, totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
