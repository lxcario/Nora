import { getExamById } from "@/app/(protected)/app/_actions/exam";
import { redirect } from "next/navigation";
import { ExamResults } from "../../_components/exam-results";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { data, error } = await getExamById(examId);

  if (error || !data) {
    redirect("/app/exam");
  }

  // Not submitted yet → go to exam session
  if (!data.submittedAt) {
    redirect(`/app/exam/${examId}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ExamResults
        examId={data.id}
        title={data.title}
        questions={data.questions}
        scorePercent={data.scorePercent ?? 0}
        topicScores={data.topicScores ?? {}}
      />
    </div>
  );
}
