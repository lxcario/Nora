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
        <div className="mx-auto max-w-sm flex items-center justify-center">
          <Link
            href="/"
            className="font-pixel text-xl tracking-wider flex items-center gap-2"
            style={{ color: "#d4a526", textDecoration: "none" }}
          >
            <img src="/sprites/travel-book/icons/Sun.png" alt="" width={14} height={14} className="pixel-art opacity-70" />
            NORA
            <img src="/sprites/travel-book/icons/Sun.png" alt="" width={14} height={14} className="pixel-art opacity-70" />
          </Link>
        </div>
      </header>

      {children}
    </div>
  );
}
