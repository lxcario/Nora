"use client";

import { useState, useTransition } from "react";
import { discoverConnections, type EurekaConnection } from "@/app/(protected)/app/_actions/eureka";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

export function EurekaClient() {
  const [connections, setConnections] = useState<EurekaConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, startDiscovery] = useTransition();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function handleDiscover() {
    setError(null);
    startDiscovery(async () => {
      const res = await discoverConnections();
      if (res.error) setError(res.error);
      setConnections(res.connections);
    });
  }

  return (
    <div className="space-y-5">
      {/* Discover button */}
      <div className="text-center">
        <PixelButton variant="primary" onClick={handleDiscover} loading={isDiscovering} disabled={isDiscovering}>
          {isDiscovering ? "Searching for connections..." : connections.length > 0 ? "Find new connections" : "Discover connections"}
        </PixelButton>
        <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
          Analyzes your topics across different subjects to find hidden links
        </p>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 text-center" style={{ color: "var(--pixel-error)" }}>{error}</div>
      )}

      {/* Connection cards */}
      {connections.length > 0 && (
        <div className="space-y-3">
          {connections.map((conn, i) => (
            <div
              key={i}
              className="pixel-panel cursor-pointer transition-all hover:brightness-105"
              style={{ padding: "var(--pixel-panel-compact)" }}
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            >
              {/* Connection header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-pixel text-[10px] px-1.5 py-0.5" style={{ color: "var(--pixel-accent)", border: "1px solid var(--pixel-accent)" }}>
                  {conn.topicA.subject}
                </span>
                <span className="text-[var(--pixel-text-muted)]">↔</span>
                <span className="font-pixel text-[10px] px-1.5 py-0.5" style={{ color: "var(--pixel-success)", border: "1px solid var(--pixel-success)" }}>
                  {conn.topicB.subject}
                </span>
              </div>

              {/* Topic names */}
              <p className="font-pixel text-sm" style={{ color: "var(--pixel-text-primary)" }}>
                {conn.topicA.name} × {conn.topicB.name}
              </p>

              {/* Connection phrase */}
              <p className="text-xs mt-1 italic" style={{ color: "var(--pixel-text-secondary)" }}>
                &ldquo;{conn.connectionPhrase}&rdquo;
              </p>

              {/* Challenge (expanded) */}
              {expandedIdx === i && (
                <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: "var(--pixel-border)" }}>
                  <p className="font-pixel text-[9px] uppercase mb-1" style={{ color: "var(--pixel-accent)" }}>
                    Challenge
                  </p>
                  <p className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>
                    {conn.challengePrompt}
                  </p>
                  <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
                    Try explaining this connection in Feynman Mode for bonus XP.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {connections.length === 0 && !error && !isDiscovering && (
        <DialogFrame>
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <img src="/sprites/travel-book/icons/Lightbulb.png" alt="" width={32} height={32} className="pixel-art opacity-60" />
            <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
              Click above to discover connections between your topics.
              The more subjects you study, the more interesting connections appear.
            </p>
          </div>
        </DialogFrame>
      )}
    </div>
  );
}
