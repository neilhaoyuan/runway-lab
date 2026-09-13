export default function Loading() {
  return <div className="min-h-screen bg-ink p-8"><div className="h-8 w-40 animate-pulse rounded bg-line/60" /><div className="mt-10 grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-md border border-line bg-panel" />)}</div></div>;
}
