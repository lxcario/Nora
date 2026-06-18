import { getPartyState } from "../_actions/party";
import { PartyDiscovery } from "./_components/party-discovery";
import { PartyPage } from "./_components/party-page";
import { PageHeader } from "../_components/page-header";
import { DialogFrame } from "@/components/pixel-ui";
import { createClient } from "@/lib/supabase/server";

export default async function PartyRoutePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await getPartyState();

  return (
    <div className="space-y-6">
      <PageHeader title="Friends" description="Study together with friends" />

      {result.error ? (
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {result.error || "We couldn't load your group info. Try again in a moment."}
          </p>
        </DialogFrame>
      ) : result.data?.party === null ? (
        <PartyDiscovery />
      ) : (
        <PartyPage state={result.data!} currentUserId={user?.id ?? ""} />
      )}
    </div>
  );
}
