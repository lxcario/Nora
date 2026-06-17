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

      <DiscoveryPoller initialProgress={jobProgress} />

      {notice.message && (
        <div
          className="rounded-lg border-2 p-3 text-sm"
          style={{
            borderColor: notice.tone === "warning" ? "var(--pixel-warning)" : "var(--pixel-border)",
            backgroundColor: "var(--pixel-bg-surface)",
            color: "var(--pixel-text-primary)",
          }}
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
