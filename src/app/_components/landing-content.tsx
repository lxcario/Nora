"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Landing-only color source of truth (Option A)
//
// The public landing page renders OUTSIDE the app's theme/palette provider, so
// structural + text + primary-accent colors reference the `:root` design tokens
// directly via `var(--pixel-*)` — they resolve to the default (Ember) values,
// which keeps the page visually locked to Ember while removing the drift risk
// of scattered hex literals. The only values kept literal are the handful of
// landing-specific decorative accents that have no semantic theme token; they
// live here (a single block) rather than inline throughout the file.
// ---------------------------------------------------------------------------

const LANDING = {
  // Feature-card accent hues — a deliberate multi-color decorative set, not the
  // single theme accent (the two that map to tokens use var() at the call site).
  research: "#5b9bd5", // sky
  companion: "#a98bd4", // lavender
  video: "#e08a5b", // coral
  circle: "#d4708a", // rose
  // Landing-specific shades with no theme-token equivalent.
  sectionDeep: "#150f0a", // principles band — a touch deeper than bg-primary
  dimLabel: "#5a4a35", // faint section eyebrow label
} as const;

// ---------------------------------------------------------------------------
// Intersection Observer hook for scroll-triggered animations
// ---------------------------------------------------------------------------

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const items = el.querySelectorAll(".reveal-on-scroll");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return ref;
}

// ---------------------------------------------------------------------------
// Sprite helper
// ---------------------------------------------------------------------------

function Sprite({ name, size = 24, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <img
      src={`/sprites/travel-book/icons/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={`pixel-art ${className}`}
      draggable={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------

function FeatureCard({
  icon,
  title,
  description,
  accent,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  accent: string;
  delay: number;
}) {
  return (
    <div
      className="reveal-on-scroll pixel-panel group relative overflow-hidden p-6"
      style={{
        opacity: 0,
        transform: "translateY(24px)",
        transition: `filter 80ms steps(2), opacity 0.4s, transform 0.4s`,
        transitionDelay: `0ms, ${delay}ms, ${delay}ms`,
        backgroundColor: "var(--pixel-sidebar-bg)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.filter = ""; }}
    >
      {/* Accent glow */}
      <div
        className="absolute -top-12 -right-12 h-32 w-32 opacity-10 transition-opacity group-hover:opacity-20"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />

      <div
        className="relative flex h-12 w-12 items-center justify-center mb-4"
        style={{ border: `2px solid ${accent}`, backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--pixel-bg-primary))` }}
      >
        <span className="nav-ico">
          <Sprite name={icon} size={24} />
        </span>
      </div>
      <h3 className="font-pixel text-sm mb-2" style={{ color: accent }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--pixel-text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Principle pill
// ---------------------------------------------------------------------------

function PrinciplePill({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <span
      className="reveal-on-scroll pixel-panel pixel-panel-inset inline-flex items-center gap-2 px-4 py-2 font-pixel text-[10px]"
      style={{
        color: "var(--pixel-text-secondary)",
        opacity: 0,
        transform: "translateY(16px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      <Sprite name={icon} size={12} />
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Landing Content (client component for animations)
// ---------------------------------------------------------------------------

export function LandingContent() {
  const containerRef = useRevealOnScroll();

  return (
    <div
      ref={containerRef}
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--pixel-bg-primary)", color: "var(--pixel-text-primary)" }}
    >
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 px-6 py-3 backdrop-blur-sm"
        style={{
          backgroundColor: "color-mix(in srgb, var(--pixel-bg-primary) 90%, transparent)",
          borderBottom: "2px solid var(--pixel-border)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center" style={{ textDecoration: "none" }}>
            <img
              src="/noralogo.png"
              alt="NORA"
              className="pixel-art"
              style={{ height: "56px", width: "auto" }}
              draggable={false}
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-pixel text-[10px] px-4 py-2 transition-colors hover:brightness-125"
              style={{ color: "var(--pixel-text-secondary)" }}
            >
              Sign in
            </Link>
            <Link href="/signup" className="pixel-btn pixel-btn-primary pixel-btn-sm">
              Begin
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="pixel-grid-bg relative overflow-hidden">
        {/* Hero background GIF — GPU-composited layer for performance */}
        <img
          src="/mejwh.gif"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 0.12,
            imageRendering: "pixelated",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
          draggable={false}
        />
        {/* Fade to dark at bottom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 40%, var(--pixel-bg-primary) 95%)",
          }}
        />

        {/* Warm ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 40%, color-mix(in srgb, var(--pixel-accent) 6%, transparent) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-4xl px-6 py-28 sm:py-36 text-center">
          {/* Floating sprites decoration */}
          <div className="absolute top-16 left-[10%] animate-pixel-float opacity-30 hidden sm:block">
            <Sprite name="Flower" size={20} />
          </div>
          <div className="absolute top-24 right-[12%] animate-pixel-float opacity-25 hidden sm:block" style={{ animationDelay: "0.5s" }}>
            <Sprite name="Cloud" size={22} />
          </div>
          <div className="absolute bottom-20 left-[15%] animate-pixel-float opacity-20 hidden sm:block" style={{ animationDelay: "1s" }}>
            <Sprite name="MusicNotes" size={16} />
          </div>
          <div className="absolute bottom-28 right-[18%] animate-pixel-float opacity-25 hidden sm:block" style={{ animationDelay: "1.5s" }}>
            <Sprite name="Lightbulb" size={18} />
          </div>

          {/* Main content */}
          <div className="reveal-on-scroll" style={{ opacity: 0, transform: "translateY(20px)" }}>
            <p
              className="font-pixel text-[10px] mb-6 tracking-[4px]"
              style={{ color: "var(--pixel-text-muted)" }}
            >
              FOR PEOPLE WHO WANT TO UNDERSTAND
            </p>

            <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl leading-tight">
              <span style={{ color: "var(--pixel-text-primary)" }}>A softer way</span>
              <br />
              <span className="inline-flex items-center gap-3" style={{ color: "var(--pixel-accent)" }}>
                to study.
                <Sprite name="Sun" size={32} className="inline-block animate-pixel-float" />
              </span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-lg text-base sm:text-lg leading-relaxed"
              style={{ color: "var(--pixel-text-secondary)" }}
            >
              Nora helps you explain ideas in your own words, brings them back
              right before you'd forget, and never makes you feel behind.
              Studying — with company.
            </p>
          </div>

          {/* CTAs */}
          <div
            className="reveal-on-scroll mt-10 flex flex-wrap items-center justify-center gap-4"
            style={{ opacity: 0, transform: "translateY(20px)" }}
          >
            <Link href="/signup" className="pixel-btn pixel-btn-primary">
              Begin
            </Link>
            <Link href="/login" className="pixel-btn pixel-btn-secondary">
              I already have an account
            </Link>
          </div>

          {/* Trust bar */}
          <div
            className="reveal-on-scroll mt-12 pixel-panel inline-flex flex-wrap items-center justify-center gap-6 px-6 py-3 mx-auto"
            style={{ opacity: 0, transform: "translateY(16px)", backgroundColor: "var(--pixel-bg-secondary)" }}
          >
            {[
              { icon: "Trophy", text: "SPACED REPETITION" },
              { icon: "Lightbulb", text: "FEYNMAN TECHNIQUE" },
              { icon: "MagnifyingGlass", text: "AI RESEARCH" },
              { icon: "Team", text: "STUDY TOGETHER" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2">
                <Sprite name={item.icon} size={16} className="opacity-80" />
                <span className="font-pixel text-[10px] tracking-wide" style={{ color: "var(--pixel-text-secondary)" }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ borderTop: "2px solid var(--pixel-border)" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="reveal-on-scroll mb-14 text-center" style={{ opacity: 0, transform: "translateY(20px)" }}>
            <p className="font-pixel text-[10px] mb-3 tracking-[4px]" style={{ color: LANDING.dimLabel }}>
              HOW IT ACTUALLY WORKS
            </p>
            <h2 className="font-pixel text-2xl sm:text-3xl" style={{ color: "var(--pixel-accent)" }}>
              Not another flashcard app
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="Lightbulb"
              title="Feynman Mode"
              description="Try explaining a topic like you're teaching someone. Nora listens, asks hard follow-up questions, and shows you exactly where you're fuzzy."
              accent="var(--pixel-accent)"
              delay={0}
            />
            <FeatureCard
              icon="Book"
              title="Memories that return"
              description="Cards come back right when you're about to forget them. Not a day before, not a week late. The scheduling happens for you, so you just show up and remember."
              accent="var(--pixel-success)"
              delay={100}
            />
            <FeatureCard
              icon="MagnifyingGlass"
              title="Research Desk"
              description="Got a question? Ask it in normal words. Nora digs through books and sources, writes you a proper answer, and makes cards from it."
              accent={LANDING.research}
              delay={200}
            />
            <FeatureCard
              icon="PetBowl"
              title="Your Companion"
              description="A companion that lives in your study room. It notices when you study and rests quietly when you don't. No guilt — it's just glad you're here."
              accent={LANDING.companion}
              delay={300}
            />
            <FeatureCard
              icon="Monitor"
              title="Video Notes"
              description="Paste a YouTube link, watch the lecture, and Nora generates timestamped notes. Turn any video into flashcards in one click."
              accent={LANDING.video}
              delay={400}
            />
            <FeatureCard
              icon="Team"
              title="Study Circle"
              description="Grab a few friends, make a group, tackle weekly goals together. It's studying with company, not a competition."
              accent={LANDING.circle}
              delay={500}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          PRINCIPLES
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="py-20"
        style={{ borderTop: "2px solid var(--pixel-border)", backgroundColor: LANDING.sectionDeep }}
      >
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="reveal-on-scroll" style={{ opacity: 0, transform: "translateY(20px)" }}>
            <Sprite name="Flower" size={28} className="mx-auto mb-4 opacity-70" />
            <h2 className="font-pixel text-xl sm:text-2xl mb-4" style={{ color: "var(--pixel-accent)" }}>
              Built slowly, on purpose
            </h2>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--pixel-text-secondary)" }}>
              Most study apps either do nothing or do everything for you.
              Nora sits in the middle — it asks you to think, checks whether the
              idea actually landed, and never pretends understanding should feel effortless.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <PrinciplePill icon="PotionRed" text="Miss a day? Nothing resets. Life happens." delay={0} />
            <PrinciplePill icon="Team" text="Friends, not rankings" delay={100} />
            <PrinciplePill icon="Lightbulb" text="The AI asks questions. You do the thinking." delay={200} />
            <PrinciplePill icon="Trophy" text="You see your actual progress" delay={300} />
            <PrinciplePill icon="FlowerPot" text="Warm, not sterile" delay={400} />
            <PrinciplePill icon="Book" text="Methods that actually work" delay={500} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ borderTop: "2px solid var(--pixel-border)" }}>
        <div className="mx-auto max-w-lg px-6 text-center">
          <div
            className="reveal-on-scroll pixel-panel relative overflow-hidden"
            style={{
              backgroundColor: "color-mix(in srgb, var(--pixel-accent) 8%, var(--pixel-bg-primary))",
              padding: "40px 32px",
              opacity: 0,
              transform: "translateY(20px)",
            }}
          >
            {/* Warm glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(circle at 50% 30%, var(--pixel-accent), transparent 60%)" }}
            />

            <div className="relative">
              <Sprite name="Home" size={32} className="mx-auto mb-4" />
              <p
                className="font-pixel text-[10px] mb-2 tracking-[3px]"
                style={{ color: "var(--pixel-text-muted)" }}
              >
                WHENEVER YOU'RE READY
              </p>
              <h2 className="font-pixel text-2xl mb-3" style={{ color: "var(--pixel-accent)" }}>
                Come learn with us
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--pixel-text-secondary)" }}>
                Free to start. Pick a companion, name your subjects,
                and explain your first idea today.
              </p>
              <Link href="/signup" className="pixel-btn pixel-btn-primary">
                Create my account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="px-6 py-8" style={{ borderTop: "2px solid var(--pixel-border)" }}>
        <div className="mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/noralogo.png"
              alt="NORA"
              height={16}
              className="pixel-art opacity-60"
              style={{ height: "16px", width: "auto" }}
              draggable={false}
            />
          </div>
          <p className="text-[11px]" style={{ color: "var(--pixel-border)" }}>
            Art: Sprout Lands (Cup Nooble) and Travel Book (Crusenho, CC BY 4.0)
          </p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════
          SCROLL ANIMATION STYLES (injected inline for this page only)
          ═══════════════════════════════════════════════════════════════════ */}
      <style>{`
        .reveal-on-scroll {
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .reveal-on-scroll.revealed {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  );
}
