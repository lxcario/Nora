import { PageHeader } from "../_components/page-header";
import { DialogFrame, CursorPicker, PreferencesPanel } from "@/components/pixel-ui";
import { createClient } from "@/lib/supabase/server";
import { CompanionPicker } from "./_components/companion-picker";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let currentPetType: string | null = null;
  if (user) {
    const { data: pet } = await supabase
      .from("pets")
      .select("pet_type")
      .eq("user_id", user.id)
      .single();
    currentPetType = pet?.pet_type ?? null;
  }
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Collection"
        description="Customize your cursor, and collect themes, pets, and decorations as you study."
      />

      {/* Cursor packs */}
      <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
        Earn coins from daily quests and spend them on cursors, themes, and decorations as they unlock.
      </p>

      {/* Companions — pick your pet */}
      <DialogFrame title="COMPANIONS">
        <p className="mb-3 text-xs text-[var(--pixel-text-secondary)]">
          Choose a study buddy that lives in your sidebar. They cheer you on as you learn.
        </p>
        <CompanionPicker currentPetType={currentPetType} />
      </DialogFrame>

      <DialogFrame title="CURSORS">
        <p className="mb-3 text-xs text-[var(--pixel-text-secondary)]">
          Pick the pixel cursor that follows you around the app. Your choice is
          saved on this device.
        </p>
        <CursorPicker />
      </DialogFrame>

      {/* Placeholder collections — future unlockables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DialogFrame title="THEMES">
          <p className="text-xs text-[var(--pixel-text-secondary)] mb-3">
            Choose a color palette — your selection is saved and applies across the app.
          </p>
          <PreferencesPanel />
        </DialogFrame>

        <DialogFrame title="DECORATIONS">
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Spend coins on room decorations for your Pixel Room. Coming soon.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["FlowerPot", "Book", "CD", "Piano"].map((name) => (
              <div
                key={name}
                className="pixel-panel pixel-panel-inset flex items-center justify-center"
                style={{ height: 40, opacity: 0.5 }}
              >
                <img
                  src={`/sprites/travel-book/icons/${name}.png`}
                  alt=""
                  width={20}
                  height={20}
                  className="pixel-art"
                />
              </div>
            ))}
          </div>
        </DialogFrame>
      </div>
    </div>
  );
}
