import { PageHeader } from "../_components/page-header";
import { getRoomState } from "../_actions/room";
import { getDailyQuote } from "../_actions/quotes";
import { getPartyPresence } from "../_actions/party-presence";
import { PixelRoom } from "./_components/pixel-room";

export default async function RoomPage() {
  const [{ data, error }, quote, presence] = await Promise.all([
    getRoomState(),
    getDailyQuote(),
    getPartyPresence(),
  ]);

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pixel Room" description="Your cozy study room." />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error ?? "Failed to load room state"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pixel Room"
        description="Your cozy study room. Avatar and pet reflect your study consistency."
      />
      <PixelRoom
        state={data}
        quote={quote}
        studyingMembers={presence.data?.members ?? []}
      />
    </div>
  );
}
