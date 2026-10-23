import { CheckCircle2, CircleAlert, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import type { CallAnalysis } from "@/features/calls/interfaces/calls.interfaces";
import { AnalysisSeverityOptions } from "@/config/constants/dropdowns/calls/analysis-labels.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";

const SEVERITY_STYLES = {
  LOW: "border-amber-500/30 text-amber-700 dark:text-amber-300",
  MEDIUM: "border-orange-500/40 text-orange-700 dark:text-orange-300",
  HIGH: "border-red-500/40 text-red-700 dark:text-red-300",
};

const JumpButton = ({
  atMs,
  onJump,
}: {
  atMs: number | null;
  onJump: (ms: number) => void;
}) =>
  atMs === null ? null : (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 px-2 font-mono text-xs"
      onClick={() => onJump(atMs)}
      aria-label={`Jump to ${formatClock(atMs)}`}
    >
      <Play className="size-3" /> {formatClock(atMs)}
    </Button>
  );

export function AnalysisMoments({
  analysis,
  onJump,
}: {
  analysis: CallAnalysis;
  onJump: (ms: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <CircleAlert className="size-4 text-red-500" /> Mistakes (
          {analysis.mistakes.length})
        </h3>
        {!analysis.mistakes.length && (
          <p className="text-sm text-muted-foreground">
            No mistakes flagged. Nice work.
          </p>
        )}
        {analysis.mistakes.map((mistake, index) => (
          <Card key={index} className="space-y-3 p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{mistake.title}</p>
                <Badge
                  variant="outline"
                  className={cn("mt-1", SEVERITY_STYLES[mistake.severity])}
                >
                  {getDropdownOptionLabel(
                    AnalysisSeverityOptions,
                    mistake.severity,
                  )}
                </Badge>
              </div>
              <JumpButton atMs={mistake.at_ms} onJump={onJump} />
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What happened
                </dt>
                <dd>{mistake.what_happened}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why it matters
                </dt>
                <dd>{mistake.why_it_matters}</dd>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Do this instead
                </dt>
                <dd className="mt-0.5">{mistake.what_to_do_instead}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-4 text-emerald-500" /> Strengths (
          {analysis.strengths.length})
        </h3>
        {!analysis.strengths.length && (
          <p className="text-sm text-muted-foreground">
            No standout strengths this time.
          </p>
        )}
        {analysis.strengths.map((strength, index) => (
          <Card key={index} className="flex items-start gap-2 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{strength.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {strength.detail}
              </p>
            </div>
            <JumpButton atMs={strength.at_ms} onJump={onJump} />
          </Card>
        ))}
      </section>
    </div>
  );
}
