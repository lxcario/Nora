import { PageHeader } from "../_components/page-header";
import { EurekaClient } from "./_components/eureka-client";

export const metadata = { title: "Eureka Connections — Nora" };

export default function EurekaPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Eureka!"
        description="Discover hidden connections between your subjects. The best learning happens at the edges."
      />
      <EurekaClient />
    </div>
  );
}
