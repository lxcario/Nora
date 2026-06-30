"use client";

import { type CalibrationData } from "../../_actions/calibration";

// ---------------------------------------------------------------------------
// Metacognition — Calibration Curve Tab
// ---------------------------------------------------------------------------
// Renders the JOL confidence calibration visualization as a pixel-styled chart.
// Spec: .kiro/specs/metacognition (Requirements 2–3, 5)
// ---------------------------------------------------------------------------

const PERFECT_RATE: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
const CONFIDENCE_LABELS: Record<number, string> = {
  1: "No idea",
  2: "Unsure",
  3: "Maybe",
  4: "Pretty sure",
  5: "Certain",
};

function CalibrationBar({
  confidence,
  actual,
  count,
}: {
  confidence: number;
  actual: number;
  count: number;
}) {
  const expected = PERFECT_RATE[confidence] ?? 50;
  const isOver = actual < expected;

  return (
    <div className="flex items-end gap-1" style={{ height: 120 }}>
      {/* Expected (reference bar) */}
      <div className="relative flex flex-col items-center" style={{ width: 20 }}>
        <div
          className="w-full"
          style={{
            height: `${expected}%`,
            backgroundColor: "var(--pixel-bg-elevated)",
            border: "1px dashed var(--pixel-border)",
          }}
        />
      </div>
      {/* Actual bar */}
      <div className="relative flex flex-col items-center" style={{ width: 20 }}>
        <div
          className="w-full transition-all"
          style={{
            height: `${actual}%`,
            backgroundColor: isOver ? "var(--pixel-error)" : "var(--pixel-success)",
            opacity: 0.85,
          }}
        />
      </div>
      {/* Label below */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="font-pixel text-[8px]" style={{ color: "var(--pixel-text-secondary)" }}>
          {confidence}
        </span>
      </div>
    </div>
  );
}

export function CalibrationTab({ data }: { data: CalibrationData }) {
  if (data.classification === "insufficient-data") {
    return (
      <div className="flex flex-col items-center py-8 gap-3 text-center">
        <img
          src="/sprites/travel-book/icons/Eye.png"
          alt=""
          width={32}
          height={32}
          className="pixel-art opacity-60"
        />
        <p className="font-pixel text-sm" style={{ color: "var(--pixel-text-primary)" }}>
          Not enough data yet
        </p>
        <p className="text-xs max-w-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          {data.insight}
        </p>
      </div>
    );
  }

  const classColor =
    data.classification === "well-calibrated"
      ? "var(--pixel-success)"
      : data.classification === "overconfident"
        ? "var(--pixel-error)"
        : "var(--pixel-warning)";

  const classLabel =
    data.classification === "well-calibrated"
      ? "Well Calibrated ✓"
      : data.classification === "overconfident"
        ? "Overconfident ↑"
        : "Underconfident ↓";

  return (
    <div className="space-y-5">
      {/* Classification badge + insight */}
      <div className="flex items-start gap-3">
        <span
          className="font-pixel text-[11px] px-2 py-1 shrink-0"
          style={{ color: classColor, border: `1px solid ${classColor}` }}
        >
          {classLabel}
        </span>
        <p className="text-xs leading-relaxed" style={{ color: "var(--pixel-text-secondary)" }}>
          {data.insight}
        </p>
      </div>

      {/* Calibration curve chart */}
      <div className="pixel-panel" style={{ padding: "var(--pixel-panel-compact)" }}>
        <p className="font-pixel text-[10px] mb-3" style={{ color: "var(--pixel-text-secondary)" }}>
          CONFIDENCE vs ACTUAL RECALL
        </p>
        <div className="flex items-end justify-around gap-2" style={{ height: 140 }}>
          {[1, 2, 3, 4, 5].map((conf) => {
            const point = data.curve.find((p) => p.confidence === conf);
            const actual = point?.actualSuccessRate ?? 0;
            const expected = PERFECT_RATE[conf] ?? 50;
            const hasData = (point?.count ?? 0) >= 3;

            return (
              <div key={conf} className="flex flex-col items-center gap-1 flex-1">
                {/* Bars */}
                <div className="flex items-end gap-0.5" style={{ height: 100 }}>
                  {/* Expected */}
                  <div
                    className="w-3"
                    style={{
                      height: `${expected}%`,
                      backgroundColor: "var(--pixel-bg-elevated)",
                      border: "1px dashed var(--pixel-border)",
                    }}
                    title={`Expected: ${expected}%`}
                  />
                  {/* Actual */}
                  <div
                    className="w-3 transition-all"
                    style={{
                      height: hasData ? `${actual}%` : "0%",
                      backgroundColor: actual < expected ? "var(--pixel-error)" : "var(--pixel-success)",
                      opacity: hasData ? 0.85 : 0.3,
                    }}
                    title={hasData ? `Actual: ${actual}% (${point?.count} reviews)` : "Not enough data"}
                  />
                </div>
                {/* Confidence label */}
                <span className="font-pixel text-[8px]" style={{ color: "var(--pixel-text-secondary)" }}>
                  {conf}
                </span>
                <span className="text-[7px]" style={{ color: "var(--pixel-text-muted)" }}>
                  {CONFIDENCE_LABELS[conf]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5" style={{ border: "1px dashed var(--pixel-border)", backgroundColor: "var(--pixel-bg-elevated)" }} />
            Expected
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: "var(--pixel-success)", opacity: 0.85 }} />
            Actual (on/above target)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: "var(--pixel-error)", opacity: 0.85 }} />
            Actual (below target)
          </span>
        </div>
      </div>

      {/* Deviation score */}
      <div className="pixel-panel pixel-panel-inset px-4 py-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
          Calibration deviation
        </span>
        <span className="font-pixel text-base" style={{ color: classColor }}>
          {data.overallDeviation.toFixed(1)}%
        </span>
      </div>

      {/* Per-topic breakdown */}
      {data.topicBreakdown.length > 0 && (
        <div>
          <p className="font-pixel text-[10px] mb-2" style={{ color: "var(--pixel-text-secondary)" }}>
            WORST CALIBRATED TOPICS
          </p>
          <div className="space-y-1">
            {data.topicBreakdown.slice(0, 5).map((t) => (
              <div
                key={t.topicName}
                className="flex items-center justify-between px-3 py-1.5 text-xs"
                style={{ backgroundColor: "var(--pixel-bg-elevated)" }}
              >
                <span style={{ color: "var(--pixel-text-primary)" }}>{t.topicName}</span>
                <span style={{ color: t.deviation > 20 ? "var(--pixel-error)" : "var(--pixel-warning)" }}>
                  ±{t.deviation.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <p className="text-[10px] text-center" style={{ color: "var(--pixel-text-muted)" }}>
        Based on {data.totalReviewsWithJol} reviews with confidence ratings
      </p>
    </div>
  );
}
