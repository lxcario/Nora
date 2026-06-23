import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ backgroundColor: "var(--pixel-bg-primary)" }}
    >
      <div
        className="pixel-panel flex flex-col items-center gap-4 p-8 text-center"
        style={{ backgroundColor: "var(--pixel-bg-elevated)" }}
      >
        <p
          className="font-pixel text-6xl"
          style={{ color: "var(--pixel-text-muted)" }}
        >
          404
        </p>
        <h1 className="font-pixel text-xl" style={{ color: "var(--pixel-text)" }}>
          Page not found
        </h1>
        <p style={{ color: "var(--pixel-text-muted)", fontSize: "0.875rem" }}>
          This route doesn&apos;t exist in Nora.
        </p>
        <Link
          href="/app"
          className="pixel-btn pixel-btn-primary inline-flex items-center gap-2 px-4 py-2 font-pixel text-sm"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
