export default function Loading() {
  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-9 w-64 rounded-lg bg-slate-300/70 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="surface-card p-5 space-y-3 h-28"
          >
            <div className="h-8 w-16 rounded bg-slate-300/70 dark:bg-slate-800" />
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800/70" />
          </div>
        ))}
      </div>
      <div className="surface-card p-6 space-y-4">
        <div className="h-5 w-72 rounded bg-slate-300/70 dark:bg-slate-800" />
        <div className="h-11 w-full rounded bg-slate-200 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}
