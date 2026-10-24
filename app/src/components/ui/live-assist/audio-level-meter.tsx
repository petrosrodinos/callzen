import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioLevelMeterProps {
  getLevel: () => number;
  label: string;
  className?: string;
  bars?: number;
}

// Lightweight canvas-free meter: mutates bar heights directly to avoid re-rendering at 60fps.
export function AudioLevelMeter({ getLevel, label, className, bars = 5 }: AudioLevelMeterProps) {
  const { t } = useTranslation("common");
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const level = getLevel();
      const children = containerRef.current?.children;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          const threshold = (i + 1) / children.length;
          (children[i] as HTMLElement).style.opacity = level >= threshold * 0.6 ? "1" : "0.25";
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)} aria-label={t("liveAssist.audioLevel", { label })}>
      <span ref={containerRef} className="inline-flex h-3.5 items-end gap-0.5">
        {Array.from({ length: bars }).map((_, i) => (
          <span key={i} className="w-1 rounded-sm bg-emerald-500 transition-opacity" style={{ height: `${30 + (i * 70) / bars}%`, opacity: 0.25 }} />
        ))}
      </span>
      {label}
    </span>
  );
}
