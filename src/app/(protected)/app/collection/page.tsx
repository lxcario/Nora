import { PageHeader } from "../_components/page-header";
import { DialogFrame, CursorPicker, PreferencesPanel } from "@/components/pixel-ui";

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

      {/* Companions — pick your pet */}
      <DialogFrame title="COMPANIONS">
        <p className="mb-3 text-xs text-[var(--pixel-text-secondary)]">
          Choose a study buddy that lives in your sidebar. They cheer you on as you learn.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {[
            { id: 25, name: "Pikachu" },
            { id: 133, name: "Eevee" },
            { id: 39, name: "Jigglypuff" },
            { id: 52, name: "Meowth" },
            { id: 175, name: "Togepi" },
            { id: 196, name: "Espeon" },
            { id: 197, name: "Umbreon" },
            { id: 393, name: "Piplup" },
            { id: 447, name: "Riolu" },
            { id: 700, name: "Sylveon" },
          ].map((pet) => (
            <div
              key={pet.id}
              className="pixel-panel pixel-panel-inset flex flex-col items-center gap-1 py-2 px-1 cursor-pointer pixel-hover-brighten"
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pet.id}.gif`}
                alt={pet.name}
                width={40}
                height={40}
                className="pixel-art"
              />
              <span className="font-pixel text-[8px] text-center" style={{ color: "var(--pixel-text-primary)" }}>
                {pet.name}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] font-pixel" style={{ color: "var(--pixel-text-muted)" }}>
          Pet selection coming soon — for now, visit Pixel Room to set your companion.
        </p>
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
