"use client";

import { useState, useTransition } from "react";
import { Target, Heart, Trophy, HelpCircle } from "lucide-react";
import type { PartyQuestView } from "../../_actions/party";
import { checkAndGenerateHelpQuests } from "../../_actions/party-quests";

interface PartyQuestsProps {
  quests: PartyQuestView[];
  helpQuests: PartyQuestView[];
  partyId: string;
}

/** Human-readable labels for quest types */
const QUEST_TYPE_LABELS: Record<PartyQuestView["questType"], string> = {
  cards_reviewed: "Cards Reviewed",
  feynman_sessions: "Feynman Sessions",
  study_minutes: "Study Minutes",
};

/** Color classes for progress bars by quest type */
const QUEST_TYPE_COLORS: Record<PartyQuestView["questType"], string> = {
  cards_reviewed: "bg-[var(--pixel-accent)]",
  feynman_sessions: "bg-[var(--pixel-success)]",
  study_minutes: "bg-[var(--pixel-warning)]",
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
  const barColor = isHelp ? "bg-[var(--pixel-warning)]" : QUEST_TYPE_COLORS[quest.questType];

  return (
    <div
      className={`border-2 p-4 ${
        isHelp
          ? "border-[var(--pixel-warning)] bg-[color-mix(in_srgb,var(--pixel-warning)_12%,var(--pixel-bg-surface))]"
          : "border-[var(--pixel-border)] bg-[var(--pixel-bg-surface)]"
      }`}
    >
      {/* Quest header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHelp ? (
            <Heart className="h-4 w-4 text-[var(--pixel-warning)]" />
          ) : (
            <Target className="h-4 w-4 text-[var(--pixel-text-secondary)]" />
          )}
          <span
            className={`text-sm font-medium ${
              isHelp
                ? "text-[var(--pixel-warning)]"
                : "text-[var(--pixel-text-primary)]"
            }`}
          >
            {isHelp && quest.helpedMemberName
              ? `Help ${quest.helpedMemberName}!`
              : QUEST_TYPE_LABELS[quest.questType]}
          </span>
          {!isHelp && (
            <span className="text-xs text-[var(--pixel-text-muted)]">
              {QUEST_TYPE_LABELS[quest.questType]}
            </span>
          )}
        </div>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 bg-[color-mix(in_srgb,var(--pixel-success)_18%,var(--pixel-bg-surface))] px-2 py-0.5 text-xs font-medium text-[var(--pixel-success)]">
            <Trophy className="h-3 w-3" />
            Completed
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className={`h-3 w-full overflow-hidden rounded-full ${
          isHelp
            ? "bg-[color-mix(in_srgb,var(--pixel-warning)_25%,var(--pixel-bg-surface))]"
            : "bg-[var(--pixel-bg-elevated)]"
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
              ? "text-[var(--pixel-warning)]"
              : "text-[var(--pixel-text-secondary)]"
          }`}
        >
          {quest.progress} / {quest.target}
        </span>
        <span
          className={`text-sm font-medium ${
            isHelp
              ? "text-[var(--pixel-warning)]"
              : "text-[var(--pixel-text-secondary)]"
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
export function PartyQuests({ quests, helpQuests, partyId }: PartyQuestsProps) {
  const [isPending, startTransition] = useTransition();
  const [helpMsg, setHelpMsg] = useState<string | null>(null);

  function handleAskForHelp() {
    startTransition(async () => {
      const result = await checkAndGenerateHelpQuests(partyId);
      if (result.error) {
        setHelpMsg(result.error);
      } else if (result.data?.helpQuestsGenerated === 0) {
        setHelpMsg("No members need help right now — everyone is studying!");
      } else {
        setHelpMsg(`Generated ${result.data?.helpQuestsGenerated ?? 0} help quest(s). Refresh to see them.`);
      }
      setTimeout(() => setHelpMsg(null), 4000);
    });
  }

  if (quests.length === 0 && helpQuests.length === 0) {
    return (
      <div className="space-y-3">
        <div className="border-2 border-[var(--pixel-border)] p-6 text-center">
          <Target className="mx-auto h-8 w-8 text-[var(--pixel-text-muted)]" />
          <p className="mt-2 text-sm text-[var(--pixel-text-secondary)]">
            No active quests. Owner can configure quest templates.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAskForHelp}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-pixel transition-colors"
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-warning) 15%, var(--pixel-bg-surface))",
            color: "var(--pixel-warning)",
            border: "1px solid var(--pixel-warning)",
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {isPending ? "Checking..." : "Ask for Help"}
        </button>
        {helpMsg && (
          <p className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>{helpMsg}</p>
        )}
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

      {/* Manual help quest trigger */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleAskForHelp}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-pixel transition-colors"
          style={{
            backgroundColor: "color-mix(in srgb, var(--pixel-warning) 15%, var(--pixel-bg-surface))",
            color: "var(--pixel-warning)",
            border: "1px solid var(--pixel-warning)",
          }}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {isPending ? "Checking..." : "Ask for Help"}
        </button>
        {helpMsg && (
          <p className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>{helpMsg}</p>
        )}
      </div>
    </div>
  );
}
