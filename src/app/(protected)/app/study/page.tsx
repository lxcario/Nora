import { PageHeader } from "../_components/page-header";
import { generateStudyQueue } from "../_actions/study-session";
import { StudySession } from "./_components/study-session";
import { Shuffle, Layers, PenLine, FlaskConical } from "lucide-react";

export default async function StudyMixPage() {
  const { queue, error } = await generateStudyQueue();

  // Count distinct modality types in the queue
  const modalities = new Set(queue.map((item) => item.type));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Mix"
        description="Interleaved practice across subjects and modes"
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 dark:border-zinc-800 dark:bg-zinc-900">
          <Shuffle className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-500">No study items available!</p>
          <p className="mt-1 text-center text-xs text-zinc-400">
            Add topics, create flashcards, or upload papers to build your interleaved study queue.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 w-full max-w-md">
            <a
              href="/app/feynman"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 p-3 text-center text-xs text-zinc-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
            >
              <PenLine className="h-5 w-5 text-emerald-500" />
              Explain a topic
            </a>
            <a
              href="/app/review"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 p-3 text-center text-xs text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
            >
              <Layers className="h-5 w-5 text-indigo-500" />
              Create flashcards
            </a>
            <a
              href="/app/research"
              className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 p-3 text-center text-xs text-zinc-600 transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
            >
              <FlaskConical className="h-5 w-5 text-purple-500" />
              Upload a paper
            </a>
          </div>
        </div>
      ) : modalities.size <= 2 ? (
        <>
          {/* Low-diversity hint */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <Shuffle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Your mix could use more variety
              </p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Study Mix works best with flashcards, Feynman explanations, and research questions combined.
                {!modalities.has("flashcard") && " Try creating some flashcards via Feynman Mode or Research."}
                {!modalities.has("feynman_prompt") && " Add more topics in Settings to get Feynman prompts."}
                {!modalities.has("rag_question") && " Upload a PDF in Research to unlock paper-based questions."}
              </p>
            </div>
          </div>
          <StudySession queue={queue} />
        </>
      ) : (
        <StudySession queue={queue} />
      )}
    </div>
  );
}
