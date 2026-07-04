"use client";

import { useState, useTransition } from "react";
import { importDeck, type SharedDeck } from "@/app/(protected)/app/_actions/card-market";
import { DialogFrame, PixelButton } from "@/components/pixel-ui";

export function CardMarketClient({ decks, partyName }: { decks: SharedDeck[]; partyName: string | null }) {
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importing, startImport] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleImport(deck: SharedDeck) {
    const [creatorId, topicId] = deck.id.split(":");
    startImport(async () => {
      const res = await importDeck(creatorId, topicId);
      if (res.error) setFeedback(res.error);
      else {
        setFeedback(`Imported ${res.imported} cards from "${deck.topicName}"!`);
        setImportedIds((prev) => new Set([...prev, deck.id]));
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  if (decks.length === 0) {
    return (
      <div className="space-y-6">
        <DialogFrame>
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <img src="/sprites/travel-book/icons/ChestTreasure.png" alt="" width={36} height={36} className="pixel-art opacity-60" />
            <p className="font-pixel text-sm" style={{ color: "var(--pixel-text-primary)" }}>No decks available yet</p>
            <p className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
              When your party members create flashcards (3+ per topic), their decks appear here for you to import.
            </p>
          </div>
        </DialogFrame>

        {/* Coming soon shop items */}
        <DialogFrame title="SHOP — COMING SOON">
          <p className="text-xs mb-3" style={{ color: "var(--pixel-text-muted)" }}>
            Spend your coins on items for your Pixel Room and companion. Earn coins by completing quests.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: "Bookshelf", price: 50, icon: "Book" },
              { name: "Globe", price: 75, icon: "Globe" },
              { name: "Telescope", price: 120, icon: "MagnifyingGlass" },
              { name: "Crystal Ball", price: 200, icon: "Necklace" },
              { name: "Travel Book Cursor", price: 150, icon: "Cursor" },
              { name: "Pikachu Companion", price: 300, icon: "Lightbulb" },
            ].map((item) => (
              <div
                key={item.name}
                className="pixel-panel pixel-panel-inset flex flex-col items-center gap-1.5 py-3 px-2 opacity-60"
                style={{ padding: "var(--pixel-panel-compact)" }}
              >
                <img
                  src={`/sprites/travel-book/icons/${item.icon}.png`}
                  alt={item.name}
                  width={24}
                  height={24}
                  className="pixel-art"
                />
                <span className="font-pixel text-[9px] text-center" style={{ color: "var(--pixel-text-primary)" }}>
                  {item.name}
                </span>
                <span className="font-pixel text-[8px] flex items-center gap-0.5" style={{ color: "var(--pixel-accent)" }}>
                  <img src="/sprites/travel-book/icons/Coin.png" alt="" width={10} height={10} className="pixel-art" />
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </DialogFrame>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partyName && (
        <p className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-muted)" }}>
          Showing decks from <span style={{ color: "var(--pixel-accent)" }}>{partyName}</span>
        </p>
      )}

      {feedback && (
        <div className="px-3 py-2 text-xs font-pixel" style={{ color: "var(--pixel-success)", border: "1px solid var(--pixel-success)", backgroundColor: "color-mix(in srgb, var(--pixel-success) 8%, transparent)" }}>
          {feedback}
        </div>
      )}

      <div className="grid gap-3">
        {decks.map((deck) => {
          const isImported = importedIds.has(deck.id) || deck.alreadyImported;
          return (
            <div
              key={deck.id}
              className="pixel-panel flex items-center gap-4"
              style={{ padding: "var(--pixel-panel-compact)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-sm truncate" style={{ color: "var(--pixel-text-primary)" }}>
                    {deck.topicName}
                  </span>
                  <span className="font-pixel text-[8px] px-1.5 py-0.5" style={{ color: "var(--pixel-text-muted)", border: "1px solid var(--pixel-border)" }}>
                    {deck.subjectName}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--pixel-text-secondary)" }}>
                  by {deck.creatorName} · {deck.cardCount} cards
                </p>
              </div>
              {isImported ? (
                <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-success)" }}>✓ Imported</span>
              ) : (
                <PixelButton variant="secondary" size="small" onClick={() => handleImport(deck)} disabled={importing}>
                  Import
                </PixelButton>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
