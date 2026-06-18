import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="pixel-grid-bg flex min-h-screen flex-col"
      style={{ backgroundColor: "#1a1410" }}
    >
      {/* Minimal header */}
      <header className="px-6 py-4" style={{ borderBottom: "2px solid #3d2817" }}>
        <div className="mx-auto max-w-sm flex items-center justify-center gap-2">
          <span style={{ color: "#d4a526" }} className="text-sm">✦</span>
          <Link
            href="/"
            className="font-pixel text-xl tracking-wider"
            style={{ color: "#d4a526", textDecoration: "none" }}
          >
            NORA
          </Link>
          <span style={{ color: "#d4a526" }} className="text-sm">✦</span>
        </div>
      </header>

      {children}
    </div>
  );
}
