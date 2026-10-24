import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("library");
  const fillers = Object.entries(metrics.filler_breakdown ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">{t("detail.metrics.talkRatio")}</h3>
        <div
          className="flex h-4 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={t("detail.metrics.talkedPercent", {
            percent: metrics.talk_ratio_user,
          })}
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
              {t("detail.metrics.you")} {metrics.talk_ratio_user}%
            </span>{" "}
            <span className="text-muted-foreground">
              ({metrics.user_talk_seconds}s)
            </span>
          </span>
          <span>
            <span className="font-semibold">
              {t("detail.metrics.prospect")} {metrics.talk_ratio_prospect}%
            </span>{" "}
            <span className="text-muted-foreground">
              ({metrics.prospect_talk_seconds}s)
            </span>
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("detail.metrics.talkHint")}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label={t("detail.metrics.questionsAsked")}
          value={metrics.questions_asked}
        />
        <StatCard
          label={t("detail.metrics.longestMonologue")}
          value={`${metrics.longest_monologue_seconds}s`}
        />
        <StatCard
          label={t("detail.metrics.speakingPace")}
          value={t("detail.metrics.paceValue", {
            value: metrics.speaking_pace_wpm,
          })}
          hint={t("detail.metrics.paceHint")}
        />
        <StatCard
          label={t("detail.metrics.fillerWords")}
          value={metrics.filler_words}
          hint={
            fillers
              .slice(0, 3)
              .map(([word, count]) => `${word} ×${count}`)
              .join(" · ") || undefined
          }
        />
        <StatCard
          label={t("detail.metrics.interruptions")}
          value={metrics.interruptions}
        />
        <StatCard
          label={t("detail.metrics.objectionsHandled")}
          value={`${metrics.objections_handled}/${metrics.objections_raised}`}
        />
      </div>

      {metrics.objections?.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">
            {t("detail.metrics.objections")}
          </h3>
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
          <h3 className="mb-3 font-semibold">
            {t("detail.metrics.buyingSignals")}
          </h3>
          <ul className="space-y-2">
            {metrics.buying_signals.map((signal, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    signal.acted_on ? "text-emerald-600" : "text-amber-600"
                  }
                >
                  {signal.acted_on
                    ? t("detail.metrics.actedOn")
                    : t("detail.metrics.missed")}
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
