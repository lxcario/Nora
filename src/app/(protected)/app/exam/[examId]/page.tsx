import { getExamById } from "@/app/(protected)/app/_actions/exam";
import { redirect } from "next/navigation";
import { ExamRunner } from "../_components/exam-runner";

export default async function ExamSessionPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const { data, error } = await getExamById(examId);

  if (error || !data) {
    redirect("/app/exam");
  }

  // Already submitted → go to results
  if (data.submittedAt) {
    redirect(`/app/exam/${examId}/results`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <ExamRunner
        examId={data.id}
        questions={data.questions}
        timeLimit={data.timeLimit}
        title={data.title}
      />
    </div>
  );
}
