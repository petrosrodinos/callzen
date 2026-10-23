export function SpeakingBars({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-primary" role="status">
      <span className="inline-flex h-5 items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="animate-speaking-bar h-full w-1 rounded-full bg-primary" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </span>
      {label}
    </span>
  );
}
