import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-pixel text-6xl text-zinc-300 dark:text-zinc-700">404</p>
        <h1 className="font-pixel text-xl">Page not found</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This route doesn&apos;t exist in Nora.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
