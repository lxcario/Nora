import { PageHeader } from "../_components/page-header";
import { DialogFrame, CursorPicker } from "@/components/pixel-ui";

export default function CollectionPage() {
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
          <p className="text-xs text-[var(--pixel-text-secondary)]">
            Unlock new color palettes as you level up. Coming soon.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["#d4a526", "#7da856", "#5b9bd5", "#c45a58"].map((c) => (
              <div
                key={c}
                className="pixel-panel"
                style={{ height: 40, backgroundColor: c, opacity: 0.4 }}
                aria-hidden
              />
            ))}
          </div>
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
