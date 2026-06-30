import Link from "next/link";
import { PageHeader } from "../_components/page-header";
import { getMemoryMap, type MemoryMapTopic, type PlantHealth } from "../_actions/memory-map";
import { DialogFrame } from "@/components/pixel-ui";

export const metadata = { title: "Memory Garden — Nora" };

// ---------------------------------------------------------------------------
// Plant sprites — pixel-art plant at each health state
// Using existing travel-book icons for the pixel-art garden aesthetic.
// ---------------------------------------------------------------------------

const PLANT_CONFIG: Record<PlantHealth, { icon: string; label: string; color: string }> = {
  blooming: { icon: "/sprites/travel-book/icons/Flower2.png", label: "Blooming", color: "var(--pixel-success)" },
  healthy:  { icon: "/sprites/travel-book/icons/Flower.png",  label: "Healthy",  color: "var(--pixel-accent)" },
  wilting:  { icon: "/sprites/travel-book/icons/FlowerPot.png", label: "Needs water", color: "var(--pixel-warning)" },
  dead:     { icon: "/sprites/travel-book/icons/Skull.png",   label: "Forgotten", color: "var(--pixel-error)" },
  new:      { icon: "/sprites/travel-book/icons/Wheat.png",   label: "Seedling",  color: "var(--pixel-text-secondary)" },
};

function PlantCard({ topic }: { topic: MemoryMapTopic }) {
  const config = PLANT_CONFIG[topic.health];
  const isActionable = topic.health === "wilting" || topic.health === "dead";

  const inner = (
    <div
      className="pixel-panel flex flex-col items-center gap-2 px-3 py-4 transition-all hover:brightness-110"
      style={{
        borderColor: isActionable ? config.color : undefined,
        borderWidth: isActionable ? "2px" : undefined,
      }}
    >
      {/* Plant sprite */}
      <div className={topic.health === "wilting" || topic.health === "dead" ? "animate-pixel-float" : ""}>
        <img
          src={config.icon}
          alt={config.label}
          width={32}
          height={32}
          className="pixel-art"
          draggable={false}
        />
      </div>

      {/* Topic name */}
      <span
        className="font-pixel text-[10px] text-center leading-tight line-clamp-2"
        style={{ color: "var(--pixel-text-primary)" }}
        title={topic.topicName}
      >
        {topic.topicName}
      </span>

      {/* Health badge */}
      <span className="font-pixel text-[8px]" style={{ color: config.color }}>
        {config.label}
      </span>

      {/* Retrievability % */}
      <span className="text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
        {topic.health === "new" ? "No reviews" : `${Math.round(topic.retrievability * 100)}%`}
      </span>

      {/* Subject dot */}
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: topic.subjectColor }}
        title={topic.subjectName}
      />
    </div>
  );

  if (isActionable) {
    return (
      <Link
        href={`/app/review?topic=${topic.topicId}`}
        title={`Review ${topic.topicName} — ${topic.cardCount} cards`}
        style={{ textDecoration: "none" }}
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

// ---------------------------------------------------------------------------
// Summary strip (spec 4.1)
// ---------------------------------------------------------------------------

function GardenSummary({ topics }: { topics: MemoryMapTopic[] }) {
  const counts: Record<PlantHealth, number> = { blooming: 0, healthy: 0, wilting: 0, dead: 0, new: 0 };
  topics.forEach((t) => counts[t.health]++);

  return (
    <div className="flex flex-wrap items-center gap-4 font-pixel text-[11px]">
      {counts.blooming > 0 && (
        <span style={{ color: PLANT_CONFIG.blooming.color }}>🌸 {counts.blooming} blooming</span>
      )}
      {counts.healthy > 0 && (
        <span style={{ color: PLANT_CONFIG.healthy.color }}>🌿 {counts.healthy} healthy</span>
      )}
      {counts.wilting > 0 && (
        <span style={{ color: PLANT_CONFIG.wilting.color }}>🥀 {counts.wilting} need watering</span>
      )}
      {counts.dead > 0 && (
        <span style={{ color: PLANT_CONFIG.dead.color }}>💀 {counts.dead} forgotten</span>
      )}
      {counts.new > 0 && (
        <span style={{ color: PLANT_CONFIG.new.color }}>🌱 {counts.new} new</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MemoryMapPage() {
  const { topics, error } = await getMemoryMap();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Garden"
        description="Each plant represents a topic. Their health shows how well you remember — wilting plants need watering (review)."
      />

      {error && (
        <DialogFrame state="error">
          <p className="text-sm text-[var(--pixel-error)]">{error}</p>
        </DialogFrame>
      )}

      {topics.length > 0 && <GardenSummary topics={topics} />}

      {topics.length === 0 && !error && (
        <DialogFrame>
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <img
              src="/sprites/travel-book/icons/Wheat.png"
              alt=""
              width={40}
              height={40}
              className="pixel-art opacity-60"
            />
            <p className="font-pixel text-sm" style={{ color: "var(--pixel-text-primary)" }}>
              Your garden is empty
            </p>
            <p className="text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
              Create subjects and topics in Settings, then start reviewing cards to grow your garden.
            </p>
            <Link href="/app/settings" className="pixel-btn pixel-btn-primary pixel-btn-sm">
              Set up subjects
            </Link>
          </div>
        </DialogFrame>
      )}

      {topics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {topics.map((topic) => (
            <PlantCard key={topic.topicId} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}
