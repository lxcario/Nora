import { PageHeader } from "../_components/page-header";
import { KnowledgeWebClient } from "./_components/web-client";

export const metadata = { title: "Knowledge Web — Nora" };

export default function KnowledgeWebPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Knowledge Web"
        description="See how your concepts connect across subjects. Tap a node to explore its relationships."
      />
      <KnowledgeWebClient />
    </div>
  );
}
