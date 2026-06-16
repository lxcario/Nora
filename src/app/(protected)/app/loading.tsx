import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="font-pixel text-sm text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
