import { Play, ShieldCheck, ShieldX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatClock } from "@/lib/date";
import type { ConversationMetrics } from "@/features/calls/interfaces/calls.interfaces";

export function AnalysisMetrics({
  metrics,
  onJump,
}: {
  metrics: ConversationMetrics;
  onJump: (ms: number) => void;
}) {
  const fillers = Object.entries(metrics.filler_breakdown ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Talk-to-listen ratio</h3>
        <div
          className="flex h-4 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`You talked ${metrics.talk_ratio_user}% of the time`}
        >
          <div
            className="bg-primary"
            style={{ width: `${metrics.talk_ratio_user}%` }}
          />
          <div
            className="bg-[var(--chart-2)]"
            style={{ width: `${metrics.talk_ratio_prospect}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>
            <span className="font-semibold text-primary">
              You {metrics.talk_ratio_user}%
            </span>{" "}
            <span className="text-muted-foreground">
              ({metrics.user_talk_seconds}s)
            </span>
          </span>
          <span>
            <span className="font-semibold">
              Prospect {metrics.talk_ratio_prospect}%
            </span>{" "}
            <span className="text-muted-foreground">
              ({metrics.prospect_talk_seconds}s)
            </span>
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Top performers usually talk 40–60% of the time on discovery calls.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Questions asked" value={metrics.questions_asked} />
        <StatCard
          label="Longest monologue"
          value={`${metrics.longest_monologue_seconds}s`}
        />
        <StatCard
          label="Speaking pace"
          value={`${metrics.speaking_pace_wpm} wpm`}
          hint="Natural range: 130–170"
        />
        <StatCard
          label="Filler words"
          value={metrics.filler_words}
          hint={
            fillers
              .slice(0, 3)
              .map(([word, count]) => `${word} ×${count}`)
              .join(" · ") || undefined
          }
        />
        <StatCard label="Interruptions" value={metrics.interruptions} />
        <StatCard
          label="Objections handled"
          value={`${metrics.objections_handled}/${metrics.objections_raised}`}
        />
      </div>

      {metrics.objections?.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Objections</h3>
          <ul className="space-y-3">
            {metrics.objections.map((objection, index) => (
              <li key={index} className="flex items-start gap-3">
                {objection.handled ? (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                  <ShieldX className="mt-0.5 size-4 shrink-0 text-red-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">“{objection.objection}”</p>
                  <p className="text-sm text-muted-foreground">
                    {objection.comment}
                  </p>
                </div>
                {objection.at_ms !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono text-xs"
                    onClick={() => onJump(objection.at_ms as number)}
                  >
                    <Play className="size-3" /> {formatClock(objection.at_ms)}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {metrics.buying_signals?.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Buying signals</h3>
          <ul className="space-y-2">
            {metrics.buying_signals.map((signal, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    signal.acted_on ? "text-emerald-600" : "text-amber-600"
                  }
                >
                  {signal.acted_on ? "Acted on" : "Missed"}
                </span>
                <span className="flex-1">{signal.signal}</span>
                {signal.at_ms !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-mono text-xs"
                    onClick={() => onJump(signal.at_ms as number)}
                  >
                    <Play className="size-3" /> {formatClock(signal.at_ms)}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
