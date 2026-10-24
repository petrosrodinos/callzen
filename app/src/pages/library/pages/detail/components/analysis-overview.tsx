import { useTranslation } from "react-i18next";
import { CheckCircle2, ListChecks, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/format";
import type { CallAnalysis } from "@/features/calls/interfaces/calls.interfaces";

const BAR_COLORS = {
  great: "bg-emerald-500",
  good: "bg-sky-500",
  fair: "bg-amber-500",
  poor: "bg-red-500",
  none: "bg-muted-foreground/30",
};

export function AnalysisOverview({ analysis }: { analysis: CallAnalysis }) {
  const { t } = useTranslation("library");
  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-start">
        <ScoreRing
          score={analysis.overall_score}
          label={t("detail.overview.overallScore")}
        />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("detail.overview.verdict")}
          </p>
          <p className="text-lg font-medium leading-snug">{analysis.verdict}</p>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Target className="size-4 text-primary" />{" "}
            {t("detail.overview.skillScores")}
          </h3>
          <ul className="space-y-3">
            {analysis.category_scores.map((category) => {
              const tone = scoreTone(category.score);
              return (
                <li key={category.key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span>{category.label}</span>
                    <span className="font-semibold tabular-nums">
                      {category.score ?? "–"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", BAR_COLORS[tone])}
                      style={{ width: `${category.score ?? 0}%` }}
                    />
                  </div>
                  {category.comment && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.comment}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <ListChecks className="size-4 text-primary" />{" "}
              {t("detail.overview.focusNextTime")}
            </h3>
            <ol className="space-y-3">
              {analysis.improvements.map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.tip}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {analysis.next_steps.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">
                {t("detail.overview.nextSteps")}
              </h3>
              <ul className="space-y-2">
                {analysis.next_steps.map((step) => (
                  <li key={step} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {step}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
