import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/format";

const TONE_CLASSES = {
  great: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  good: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  fair: "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300",
  poor: "bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-300",
  none: "bg-muted text-muted-foreground ring-border",
};

const STROKE_CLASSES = {
  great: "stroke-emerald-500",
  good: "stroke-sky-500",
  fair: "stroke-amber-500",
  poor: "stroke-red-500",
  none: "stroke-muted-foreground/30",
};

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span className={cn("inline-flex min-w-10 items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-inset", TONE_CLASSES[tone], className)}>
      {score ?? "–"}
    </span>
  );
}

export function ScoreRing({ score, size = 112, label = "Score" }: { score: number | null | undefined; size?: number; label?: string }) {
  const tone = scoreTone(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score ?? "not available"} out of 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={cn("transition-[stroke-dashoffset] duration-700", STROKE_CLASSES[tone])}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums leading-none">{score ?? "–"}</span>
        <span className="mt-1 text-[11px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}
