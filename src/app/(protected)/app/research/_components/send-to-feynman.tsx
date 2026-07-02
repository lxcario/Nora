"use client";

import { useRouter } from "next/navigation";

interface SendToFeynmanProps {
  selectedText: string;
  paperTitle?: string;
  researchQuestion?: string;
}

export function SendToFeynman({ selectedText, paperTitle, researchQuestion }: SendToFeynmanProps) {
  const router = useRouter();
  const isValidLength = selectedText.length >= 10 && selectedText.length <= 500;

  function handleClick() {
    if (!isValidLength) return;
    const params = new URLSearchParams();
    params.set("topic", selectedText);
    if (paperTitle) params.set("source", paperTitle);
    if (researchQuestion) params.set("context", researchQuestion);
    router.push(`/app/feynman?${params.toString()}`);
  }

  return (
    <div className="relative inline-block group">
      <button
        onClick={handleClick}
        disabled={!isValidLength}
        className="pixel-panel pixel-hover-brighten inline-flex items-center gap-1.5 font-pixel text-[10px] px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: isValidLength ? "var(--pixel-accent)" : "var(--pixel-text-muted)" }}
      >
        <img
          src="/sprites/travel-book/icons/Lightbulb.png"
          alt=""
          width={12}
          height={12}
          className="pixel-art"
        />
        Send to Feynman
      </button>

      {!isValidLength && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap pixel-panel font-pixel text-[9px] px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--pixel-text-secondary)" }}
        >
          10–500 characters
        </span>
      )}
    </div>
  );
}
