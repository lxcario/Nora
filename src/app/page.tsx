import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#1a1410", color: "#f0e6d2" }}
    >
      {/* ─── Header ─── */}
      <header
        className="px-6 py-4"
        style={{ borderBottom: "2px solid #3d2817" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: "#d4a526" }} className="text-sm">✦</span>
            <span className="font-pixel text-xl tracking-wider" style={{ color: "#d4a526" }}>
              NORA
            </span>
            <span style={{ color: "#d4a526" }} className="text-sm">✦</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-pixel text-xs px-4 py-2 transition-colors"
              style={{ color: "#c4a882" }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="pixel-btn pixel-btn-primary pixel-btn-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <main className="flex-1">
        <section className="pixel-grid-bg mx-auto max-w-5xl px-6 py-24 text-center">
          {/* Pixel mascot / icon area */}
          <div className="mb-6 flex items-center justify-center">
            <div
              className="relative flex h-20 w-20 items-center justify-center"
              style={{
                border: "3px solid #d4a526",
                backgroundColor: "#241c14",
                imageRendering: "pixelated",
              }}
            >
              <img
                src="/sprites/travel-book/icons/Book.png"
                alt=""
                width={40}
                height={40}
                className="pixel-art"
              />
              {/* corner decorations */}
              <span
                className="absolute -top-1 -left-1 font-pixel text-[8px]"
                style={{ color: "#d4a526" }}
              >★</span>
              <span
                className="absolute -top-1 -right-1 font-pixel text-[8px]"
                style={{ color: "#d4a526" }}
              >★</span>
            </div>
          </div>

          <p className="font-pixel text-xs mb-3" style={{ color: "#c4a882", letterSpacing: "3px" }}>
            A SOFTER WAY TO STUDY
          </p>

          <h1
            className="font-pixel text-4xl leading-snug sm:text-5xl"
            style={{ color: "#f0e6d2" }}
          >
            Study smarter.
            <br />
            <span style={{ color: "#d4a526" }}>Stay cozy. 🌟</span>
          </h1>

          <p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed"
            style={{ color: "#c4a882" }}
          >
            Nora combines evidence-based learning with a cozy pixel-art world.
            Explain concepts, review flashcards, research papers —
            while your Pokémon companion grows alongside your skills.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="pixel-btn pixel-btn-primary">
              Start studying free ✨
            </Link>
            <Link href="/login" className="pixel-btn pixel-btn-secondary">
              I have an account
            </Link>
          </div>

          {/* Little stats row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {[
              { icon: "Trophy.png", text: "SM-2 Spaced Repetition" },
              { icon: "Lightbulb.png", text: "Feynman Technique" },
              { icon: "MagnifyingGlass.png", text: "AI Research Desk" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <img
                  src={`/sprites/travel-book/icons/${item.icon}`}
                  alt=""
                  width={14}
                  height={14}
                  className="pixel-art opacity-70"
                />
                <span className="font-pixel text-[9px]" style={{ color: "#8b7355" }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features ─── */}
        <section
          className="py-16"
          style={{ borderTop: "2px solid #3d2817" }}
        >
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-10 text-center">
              <p className="font-pixel text-xs mb-2" style={{ color: "#8b7355", letterSpacing: "3px" }}>
                WHAT NORA GIVES YOU
              </p>
              <h2 className="font-pixel text-2xl" style={{ color: "#d4a526" }}>
                Every tool you need ✦
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon="Lightbulb.png"
                title="Feynman Mode"
                description="Explain a concept out loud. An AI student asks probing questions and highlights what you actually understand — vs. what you're bluffing."
                accent="#d4a526"
              />
              <FeatureCard
                icon="Book.png"
                title="SM-2 Flashcards"
                description="Cards schedule themselves based on how well you remember. Review at the exact right moment — not too early, not too late."
                accent="#7da856"
              />
              <FeatureCard
                icon="MagnifyingGlass.png"
                title="Research Desk"
                description="Ask research questions in plain English. Nora searches books & Wikipedia, synthesizes a cited answer, and suggests flashcards."
                accent="#5b9bd5"
              />
              <FeatureCard
                icon="PetBowl.png"
                title="Pokémon Companion"
                description="Your pet lives in your cozy study room and evolves as you level up. Study consistently to keep them happy — skip and they get sad."
                accent="#a98bd4"
              />
              <FeatureCard
                icon="Trophy.png"
                title="Analytics"
                description="Track mastery per topic, 30-day streaks, and consistency heatmaps. See where you're strong and what needs attention."
                accent="#e08a5b"
              />
              <FeatureCard
                icon="Team.png"
                title="Study Circle"
                description="Create a group with friends. Tackle shared weekly quests, send cheers, and see who's been studying without turning it into a competition."
                accent="#d4708a"
              />
            </div>
          </div>
        </section>

        {/* ─── Philosophy ─── */}
        <section
          className="py-16"
          style={{ borderTop: "2px solid #3d2817", backgroundColor: "#150f0a" }}
        >
          <div className="mx-auto max-w-3xl px-6 text-center">
            <img
              src="/sprites/travel-book/icons/Coin.png"
              alt=""
              width={28}
              height={28}
              className="pixel-art mx-auto mb-4 opacity-80"
            />
            <h2 className="font-pixel text-xl mb-4" style={{ color: "#d4a526" }}>
              Learning-first. Cozy always.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#c4a882" }}>
              Unlike AI chatbots that do your homework, Nora forces you to think.
              The AI asks questions, probes gaps, and helps you research —
              but never writes your assignments. Built on evidence-based strategies:
              spaced practice, retrieval practice, and elaboration.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                "No punishment for missed days",
                "Friends, not leaderboards",
                "AI that teaches, not tells",
                "Progress you can see",
              ].map((point) => (
                <span
                  key={point}
                  className="pixel-panel pixel-panel-inset font-pixel text-[9px] px-3 py-1.5"
                  style={{ color: "#c4a882" }}
                >
                  ✓ {point}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section
          className="py-16"
          style={{ borderTop: "2px solid #3d2817" }}
        >
          <div className="mx-auto max-w-xl px-6 text-center">
            <div
              className="pixel-panel"
              style={{
                backgroundColor: "color-mix(in srgb, #d4a526 10%, #1a1410)",
                borderColor: "#d4a526",
                padding: "32px",
              }}
            >
              <p className="font-pixel text-xs mb-2" style={{ color: "#8b7355", letterSpacing: "3px" }}>
                READY TO BEGIN?
              </p>
              <h2 className="font-pixel text-2xl mb-2" style={{ color: "#d4a526" }}>
                Your study room awaits 🏠
              </h2>
              <p className="text-sm mb-6" style={{ color: "#c4a882" }}>
                Free forever. No credit card. Your Pokémon companion is already waiting.
              </p>
              <Link href="/signup" className="pixel-btn pixel-btn-primary">
                Enter Nora ✨
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer
        className="px-6 py-6"
        style={{ borderTop: "2px solid #3d2817" }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span style={{ color: "#d4a526" }} className="text-xs">✦</span>
            <span className="font-pixel text-xs" style={{ color: "#8b7355" }}>NORA</span>
            <span style={{ color: "#d4a526" }} className="text-xs">✦</span>
          </div>
          <p className="font-pixel text-[9px]" style={{ color: "#5a4a35" }}>
            Art: Sprout Lands (Cup Nooble, non-commercial) · Travel Book (Crusenho, CC BY 4.0) · Pokémon sprites (PokéAPI) · Lucide Icons (ISC)
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureCard
// ---------------------------------------------------------------------------

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div
      className="pixel-panel flex flex-col gap-3 p-5 transition-all hover:brightness-110"
      style={{ backgroundColor: "#1e1814" }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center"
        style={{
          border: `2px solid ${accent}`,
          backgroundColor: `color-mix(in srgb, ${accent} 12%, #1a1410)`,
        }}
      >
        <img
          src={`/sprites/travel-book/icons/${icon}`}
          alt=""
          width={20}
          height={20}
          className="pixel-art"
        />
      </div>
      <h3
        className="font-pixel text-sm"
        style={{ color: accent }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "#c4a882" }}>
        {description}
      </p>
    </div>
  );
}
