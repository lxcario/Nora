export default function ExamLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      <div className="h-8 w-48 bg-[var(--pixel-bg-secondary)] rounded" />
      <div className="h-4 w-72 bg-[var(--pixel-bg-secondary)] rounded" />
      <div className="pixel-panel p-6 space-y-4">
        <div className="h-6 w-32 bg-[var(--pixel-bg-secondary)] rounded" />
        <div className="h-32 w-full bg-[var(--pixel-bg-secondary)] rounded" />
        <div className="h-10 w-full bg-[var(--pixel-bg-secondary)] rounded" />
      </div>
    </div>
  );
}
