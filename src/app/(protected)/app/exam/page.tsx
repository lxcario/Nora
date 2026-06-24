import { PageHeader } from "../_components/page-header";
import { getExamHistory } from "../_actions/exam";
import { ExamSetup } from "./_components/exam-setup";
import { ExamHistoryList } from "./_components/exam-history";
import { DialogFrame } from "@/components/pixel-ui";

export default async function ExamPage() {
  const { exams } = await getExamHistory();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Practice Exam"
        description="Upload a PDF or paste your notes. AI generates a timed exam from YOUR material."
      />

      <ExamSetup />

      {exams.length > 0 && (
        <DialogFrame title="EXAM HISTORY">
          <ExamHistoryList exams={exams} />
        </DialogFrame>
      )}
    </div>
  );
}
