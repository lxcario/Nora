"use client";

import Link from "next/link";
import type { ExamHistoryItem } from "@/app/(protected)/app/_actions/exam";
import { CheckCircle, Clock, FileText } from "lucide-react";

export function ExamHistoryList({ exams }: { exams: ExamHistoryItem[] }) {
  return (
    <div className="space-y-2">
      {exams.map((exam) => {
        const isComplete = !!exam.submittedAt;
        const scoreColor =
          exam.scorePercent === null
            ? "var(--pixel-text-muted)"
            : exam.scorePercent >= 80
              ? "var(--pixel-success)"
              : exam.scorePercent >= 60
                ? "var(--pixel-warning)"
                : "var(--pixel-error)";

        return (
          <Link
            key={exam.id}
            href={isComplete ? `/app/exam/${exam.id}/results` : `/app/exam/${exam.id}`}
            className="flex items-center gap-3 p-3 transition-colors"
            style={{
              backgroundColor: "var(--pixel-bg-secondary)",
              border: "1px solid var(--pixel-border)",
            }}
          >
            <div className="shrink-0">
              {isComplete ? (
                <CheckCircle className="h-4 w-4" style={{ color: "var(--pixel-success)" }} />
              ) : (
                <Clock className="h-4 w-4" style={{ color: "var(--pixel-warning)" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: "var(--pixel-text-primary)" }}>
                {exam.title}
              </p>
              <p className="text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
                {exam.mode === "quick" ? "Quick" : "Full"} · {exam.questionCount}Q ·{" "}
                {new Date(exam.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {isComplete ? (
                <span className="font-pixel text-sm" style={{ color: scoreColor }}>
                  {exam.scorePercent}%
                </span>
              ) : (
                <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-warning)" }}>
                  IN PROGRESS
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
