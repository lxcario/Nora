import { PageHeader } from "../_components/page-header";
import { DialogFrame } from "@/components/pixel-ui";
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
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {error ?? "Failed to load room state. Try refreshing."}
          </p>
        </DialogFrame>
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
