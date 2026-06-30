"use client";

import { useState, useTransition } from "react";
import { getKnowledgeWeb, type KnowledgeWebData, type ConceptNode } from "@/app/(protected)/app/_actions/knowledge-web";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

function masteryColor(mastery: number): string {
  if (mastery >= 0.7) return "var(--pixel-success)";
  if (mastery >= 0.4) return "var(--pixel-warning)";
  return "var(--pixel-error)";
}

function ConceptCard({ node, selected, onClick }: { node: ConceptNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-panel text-left transition-all hover:brightness-110"
      style={{
        padding: "8px 10px",
        borderColor: selected ? node.color : undefined,
        borderWidth: selected ? "2px" : undefined,
        backgroundColor: selected ? `color-mix(in srgb, ${node.color} 10%, var(--pixel-bg-surface))` : undefined,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
        <span className="font-pixel text-[10px] truncate" style={{ color: "var(--pixel-text-primary)" }}>
          {node.name}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[8px]" style={{ color: "var(--pixel-text-muted)" }}>{node.subjectName}</span>
        <span className="font-pixel text-[8px]" style={{ color: masteryColor(node.mastery) }}>
          {Math.round(node.mastery * 100)}%
        </span>
      </div>
      {/* Mastery bar */}
      <div className="h-1 mt-1 overflow-hidden" style={{ backgroundColor: "var(--pixel-bg-primary)", border: "1px solid var(--pixel-border)" }}>
        <div className="h-full" style={{ width: `${node.mastery * 100}%`, backgroundColor: masteryColor(node.mastery) }} />
      </div>
    </button>
  );
}

export function KnowledgeWebClient() {
  const [webData, setWebData] = useState<KnowledgeWebData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startLoad(async () => {
      const res = await getKnowledgeWeb();
      if (res.error) setError(res.error);
      if (res.data) setWebData(res.data);
    });
  }

  const selected = webData?.nodes.find((n) => n.id === selectedNode);
  const connectedEdges = webData?.edges.filter((e) => e.from === selectedNode || e.to === selectedNode) ?? [];
  const connectedNodeIds = new Set(connectedEdges.flatMap((e) => [e.from, e.to]));

  return (
    <div className="space-y-5">
      {!webData && (
        <div className="text-center">
          <PixelButton variant="primary" onClick={handleGenerate} loading={isLoading} disabled={isLoading}>
            {isLoading ? "Building your web..." : "Generate Knowledge Web"}
          </PixelButton>
          <p className="text-[10px] mt-2" style={{ color: "var(--pixel-text-muted)" }}>
            AI analyzes your topics and finds concept relationships
          </p>
        </div>
      )}

      {error && <p className="text-sm text-center" style={{ color: "var(--pixel-error)" }}>{error}</p>}

      {webData && (
        <>
          {/* Selected node info */}
          {selected && (
            <DialogFrame title={selected.name}>
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--pixel-text-primary)" }}>{selected.topicName}</p>
                  <p className="text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>{selected.subjectName}</p>
                </div>
                <span className="ml-auto font-pixel text-sm" style={{ color: masteryColor(selected.mastery) }}>
                  {Math.round(selected.mastery * 100)}%
                </span>
              </div>
              {connectedEdges.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>CONNECTIONS</p>
                  {connectedEdges.map((edge, i) => {
                    const otherId = edge.from === selectedNode ? edge.to : edge.from;
                    const other = webData.nodes.find((n) => n.id === otherId);
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: "var(--pixel-text-muted)" }}>
                          {edge.type === "builds-on" ? "→" : edge.type === "contradicts" ? "⚡" : "↔"}
                        </span>
                        <span style={{ color: "var(--pixel-text-primary)" }}>{other?.name}</span>
                        <span style={{ color: "var(--pixel-text-muted)" }}>({edge.type})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </DialogFrame>
          )}

          {/* Concept grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {webData.nodes.map((node) => (
              <ConceptCard
                key={node.id}
                node={node}
                selected={node.id === selectedNode || connectedNodeIds.has(node.id)}
                onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--pixel-success)" }} /> Strong</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--pixel-warning)" }} /> Medium</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "var(--pixel-error)" }} /> Weak</span>
          </div>

          <div className="text-center">
            <PixelButton variant="secondary" size="small" onClick={handleGenerate} disabled={isLoading}>
              Regenerate
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
}
