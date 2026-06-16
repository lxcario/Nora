"use client";

import { Target, Heart, Trophy } from "lucide-react";
import type { PartyQuestView } from "../../_actions/party";

interface PartyQuestsProps {
  quests: PartyQuestView[];
  helpQuests: PartyQuestView[];
}

/** Human-readable labels for quest types */
const QUEST_TYPE_LABELS: Record<PartyQuestView["questType"], string> = {
  cards_reviewed: "Cards Reviewed",
  feynman_sessions: "Feynman Sessions",
  study_minutes: "Study Minutes",
};

/** Color classes for progress bars by quest type */
const QUEST_TYPE_COLORS: Record<PartyQuestView["questType"], string> = {
  cards_reviewed: "bg-indigo-500",
  feynman_sessions: "bg-emerald-500",
  study_minutes: "bg-sky-500",
};

function QuestProgressBar({
  quest,
  isHelp,
}: {
  quest: PartyQuestView;
  isHelp: boolean;
}) {
  const percentage = Math.min(
    100,
    quest.target > 0 ? Math.round((quest.progress / quest.target) * 100) : 0
  );
  const isCompleted = quest.status === "completed";
  const barColor = isHelp ? "bg-amber-500" : QUEST_TYPE_COLORS[quest.questType];

  return (
    <div
      className={`rounded-lg border p-4 ${
        isHelp
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
          : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      {/* Quest header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHelp ? (
            <Heart className="h-4 w-4 text-amber-500" />
          ) : (
            <Target className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          )}
          <span
            className={`text-sm font-medium ${
              isHelp
                ? "text-amber-800 dark:text-amber-200"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            {isHelp && quest.helpedMemberName
              ? `Help ${quest.helpedMemberName}!`
              : QUEST_TYPE_LABELS[quest.questType]}
          </span>
          {!isHelp && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {QUEST_TYPE_LABELS[quest.questType]}
            </span>
          )}
        </div>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <Trophy className="h-3 w-3" />
            Completed
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className={`h-3 w-full overflow-hidden rounded-full ${
          isHelp
            ? "bg-amber-200 dark:bg-amber-900"
            : "bg-zinc-200 dark:bg-zinc-700"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor} ${
            isCompleted ? "" : "animate-pulse"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Fraction + percentage */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-sm ${
            isHelp
              ? "text-amber-700 dark:text-amber-300"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {quest.progress} / {quest.target}
        </span>
        <span
          className={`text-sm font-medium ${
            isHelp
              ? "text-amber-700 dark:text-amber-300"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {percentage}%
        </span>
      </div>
    </div>
  );
}

/**
 * Displays active party quests (regular + help quests) with progress bars.
 *
 * Regular quests show a colored progress bar with quest type label.
 * Help quests have distinct amber/orange styling with a Heart icon and
 * the helped member's name.
 *
 * Requirements: 9.2, 9.3, 5.4
 */
export function PartyQuests({ quests, helpQuests }: PartyQuestsProps) {
  if (quests.length === 0 && helpQuests.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-6 text-center dark:border-zinc-700">
        <Target className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No active quests. Owner can configure quest templates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Regular quests */}
      {quests.map((quest) => (
        <QuestProgressBar key={quest.id} quest={quest} isHelp={false} />
      ))}

      {/* Help quests */}
      {helpQuests.map((quest) => (
        <QuestProgressBar key={quest.id} quest={quest} isHelp={true} />
      ))}
    </div>
  );
}
