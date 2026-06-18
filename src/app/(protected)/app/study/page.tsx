import { PageHeader } from "../_components/page-header";
import { generateStudyQueue } from "../_actions/study-session";
import { StudySession } from "./_components/study-session";
import { DialogFrame, EmptyState } from "@/components/pixel-ui";

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
        <DialogFrame state="error">
          <p className="text-sm" style={{ color: "var(--pixel-error)" }}>
            {error || "Couldn't build your study queue. Try refreshing."}
          </p>
        </DialogFrame>
      )}

      {queue.length === 0 ? (
        <EmptyState
          icon="shuffle"
          message="No study items available! Add topics, create flashcards, or upload papers to build your interleaved study queue."
          actionLabel="Explain a topic"
          actionHref="/app/feynman"
        />
      ) : modalities.size <= 2 ? (
        <>
          {/* Low-diversity hint */}
          <DialogFrame state="warning">
            <div className="flex items-start gap-3">
              <img
                src="/sprites/travel-book/icons/Restart.png"
                alt=""
                width={18}
                height={18}
                className="pixel-art mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--pixel-warning)" }}>
                  Your mix could use more variety
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--pixel-text-secondary)" }}>
                  Study Mix works best with flashcards, Feynman explanations, and research questions combined.
                  {!modalities.has("flashcard") && " Try creating some flashcards via Feynman Mode or Research."}
                  {!modalities.has("feynman_prompt") && " Add more topics in Settings to get Feynman prompts."}
                  {!modalities.has("rag_question") && " Upload a PDF in Research to unlock paper-based questions."}
                </p>
              </div>
            </div>
          </DialogFrame>
          <StudySession queue={queue} />
        </>
      ) : (
        <StudySession queue={queue} />
      )}
    </div>
  );
}
