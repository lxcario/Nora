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
          <Link href="/" style={{ textDecoration: "none" }}>
            <img
              src="/noralogo.png"
              alt="NORA"
              className="pixel-art"
              style={{ height: "36px", width: "auto" }}
              draggable={false}
            />
          </Link>
        </div>
      </header>

      {children}
    </div>
  );
}
