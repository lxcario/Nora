"use client";

import { Globe, FileText } from "lucide-react";

interface ResearchModeToggleProps {
  mode: "web" | "papers";
  onModeChange: (mode: "web" | "papers") => void;
}

export function ResearchModeToggle({ mode, onModeChange }: ResearchModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Research mode"
      className="inline-flex rounded-lg p-1"
      style={{
        backgroundColor: "var(--pixel-bg-surface)",
        border: "2px solid var(--pixel-border)",
      }}
    >
      <ModeButton
        active={mode === "web"}
        onClick={() => onModeChange("web")}
        icon={<Globe className="h-4 w-4" />}
        label="From web sources"
      />
      <ModeButton
        active={mode === "papers"}
        onClick={() => onModeChange("papers")}
        icon={<FileText className="h-4 w-4" />}
        label="From your papers"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-pixel transition-colors"
      style={{
        backgroundColor: active ? "var(--pixel-accent)" : "transparent",
        color: active ? "var(--pixel-bg-primary)" : "var(--pixel-text-secondary)",
        border: "none",
        letterSpacing: "0.5px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
