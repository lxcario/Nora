import { redirect } from "next/navigation";
import { getAcademicProfile } from "@/app/(protected)/app/_actions/academic/onboarding";
import { getAcademicDocuments } from "@/app/(protected)/app/_actions/academic/ingest";
import { getAcademicReviewData } from "@/app/(protected)/app/_actions/academic/review";
import { getJobProgress, getDiscoveryNotice } from "@/app/(protected)/app/_actions/academic/jobs";
import { AcademicDocumentsPanel } from "@/app/(protected)/app/_components/academic-documents-panel";
import { AcademicReviewPanel } from "@/app/(protected)/app/_components/academic-review-panel";
import { AcademicAskPanel } from "@/app/(protected)/app/_components/academic-ask-panel";
import { DiscoveryPoller } from "@/app/(protected)/app/_components/discovery-poller";

const STATUS_LABEL: Record<string, string> = {
  collecting: "Collecting your details",
  discovering: "Looking for your official sources",
  review: "Ready for your review",
  complete: "Set up",
};

export default async function AcademicPage() {
  const profile = await getAcademicProfile();
  if (!profile) redirect("/app/onboarding");

  const [documents, review, jobProgress, notice] = await Promise.all([
    getAcademicDocuments(),
    getAcademicReviewData(),
    getJobProgress(),
    getDiscoveryNotice(),
  ]);

  const subtitleParts = [
    profile.programNameRaw,
    profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : null,
    profile.term,
  ].filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="font-pixel text-lg text-[var(--pixel-accent)]">
          {profile.universityNameRaw ?? "My University"}
        </h1>
        {subtitleParts.length > 0 && (
          <p className="text-sm text-[var(--pixel-text-secondary)]">
            {subtitleParts.join(" · ")}
          </p>
        )}
        <p className="text-xs text-[var(--pixel-text-secondary)]">
          Status: {STATUS_LABEL[profile.onboardingStatus] ?? profile.onboardingStatus}
        </p>
      </header>

      {/* Guide panel */}
      <div className="pixel-panel">
        <p className="text-sm text-[var(--pixel-text-primary)]">
          Upload your university PDF (syllabus, academic calendar) and Nora will extract your courses, exam dates, and schedule.
        </p>
        {jobProgress && jobProgress.active && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--pixel-text-secondary)]">
              <span className="font-pixel">Processing...</span>
              <span className="font-pixel">
                {jobProgress.succeeded + jobProgress.failed + jobProgress.skipped} / {jobProgress.pending + jobProgress.running + jobProgress.succeeded + jobProgress.failed + jobProgress.skipped}
              </span>
            </div>
            <div className="h-2 overflow-hidden bg-[var(--pixel-bg-primary)] border border-[var(--pixel-border)]">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${
                    (() => {
                      const total = jobProgress.pending + jobProgress.running + jobProgress.succeeded + jobProgress.failed + jobProgress.skipped;
                      return total > 0 ? Math.round(((jobProgress.succeeded + jobProgress.failed + jobProgress.skipped) / total) * 100) : 0;
                    })()
                  }%`,
                  backgroundColor: "var(--pixel-accent)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <DiscoveryPoller initialProgress={jobProgress} />

      {notice.message && (
        <div
          className="pixel-panel p-3 text-sm"
          data-state={notice.tone === "warning" ? "warning" : undefined}
          style={{ color: "var(--pixel-text-primary)" }}
          role="status"
        >
          {notice.message}
        </div>
      )}

      {review.events.length > 0 || review.courses.length > 0 ? (
        <AcademicReviewPanel
          initialEvents={review.events}
          initialCourses={review.courses}
          initialStatus={review.status}
        />
      ) : null}

      {review.events.some((e) => e.status !== "unreleased") || review.courses.length > 0 ? (
        <AcademicAskPanel />
      ) : null}

      <AcademicDocumentsPanel initialDocuments={documents} />
    </div>
  );
}
