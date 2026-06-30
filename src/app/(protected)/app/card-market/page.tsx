import { PageHeader } from "../_components/page-header";
import { getPartyDecks } from "../_actions/card-market";
import { CardMarketClient } from "./_components/card-market-client";
import { DialogFrame } from "@/components/pixel-ui";
import Link from "next/link";

export const metadata = { title: "Card Market — Nora" };

export default async function CardMarketPage() {
  const { decks, partyName, error } = await getPartyDecks();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Card Market"
        description="Browse and import flashcard decks shared by your study group."
      />

      {error && (
        <DialogFrame>
          <div className="flex flex-col items-center py-6 gap-3 text-center">
            <img src="/sprites/travel-book/icons/Team.png" alt="" width={32} height={32} className="pixel-art opacity-60" />
            <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>{error}</p>
            <Link href="/app/party" className="pixel-btn pixel-btn-primary pixel-btn-sm">
              Go to Friends
            </Link>
          </div>
        </DialogFrame>
      )}

      {!error && <CardMarketClient decks={decks} partyName={partyName} />}
    </div>
  );
}
