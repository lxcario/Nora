import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles, Brain, Layers, FlaskConical, Gamepad2, BarChart3 } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="font-pixel text-lg">Nora</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="font-pixel text-4xl leading-tight sm:text-5xl">
            Study smarter,<br />not harder.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            A cozy pixel-art study OS that combines evidence-based learning with gentle gamification. 
            Explain concepts, review flashcards, research papers — while your Pokémon companion grows alongside your skills.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start studying free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              I have an account
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-zinc-800 py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="font-pixel mb-8 text-center text-2xl">How it works</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Brain}
                title="Feynman Mode"
                description="Explain concepts in your own words. AI probes your understanding and highlights gaps."
              />
              <FeatureCard
                icon={Layers}
                title="SM-2 Flashcards"
                description="Spaced repetition that adapts to how well you remember. Review at the optimal time."
              />
              <FeatureCard
                icon={FlaskConical}
                title="Research Desk"
                description="Search real academic papers. Create study cards from scientific findings."
              />
              <FeatureCard
                icon={Gamepad2}
                title="Pokémon Companion"
                description="Your pet evolves as you level up. Study consistently to keep them happy."
              />
              <FeatureCard
                icon={BarChart3}
                title="Analytics"
                description="Track mastery per topic, study streaks, and consistency with visual heatmaps."
              />
              <FeatureCard
                icon={Sparkles}
                title="Gentle Gamification"
                description="XP, coins, and missions motivate without punishment. Missed days = restorative quests."
              />
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section className="border-t border-zinc-800 py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-pixel mb-4 text-xl">Learning-first. Not AI slop.</h2>
            <p className="text-zinc-400">
              Unlike AI chatbots that do your homework, Nora forces you to think. 
              The AI asks questions, probes gaps, and helps you research — but never writes your assignments.
              Built on evidence-based strategies: spaced practice, retrieval practice, elaboration, and dual coding.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6">
        <div className="mx-auto max-w-5xl text-center text-xs text-zinc-500">
          <p>Nora — a softer way to study.</p>
          <p className="mt-1">
            Art: Sprout Lands (Cup Nooble) · Pokémon sprites (PokéAPI) · Icons (Lucide)
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <Icon className="mb-3 h-6 w-6 text-indigo-400" />
      <h3 className="font-pixel text-sm">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
