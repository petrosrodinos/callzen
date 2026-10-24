import {
  CheckCircle2,
  Eye,
  Lightbulb,
  Play,
  Quote,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import type { PracticeResult } from "@/features/calls/interfaces/calls.interfaces";
import { PracticeRevealKindOptions } from "@/config/constants/dropdowns/calls/analysis-labels.options";

export function PracticeReveal({
  result,
  objective,
  onJump,
}: {
  result: PracticeResult;
  objective: string | null | undefined;
  onJump: (ms: number) => void;
}) {
  const { t } = useTranslation("library");
  const groups = PracticeRevealKindOptions.map((kind) => ({
    ...kind,
    items: result.reveal.filter((item) => item.kind === kind.id),
  })).filter((group) => group.items.length);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "flex items-start gap-3 p-5",
          result.objective_achieved
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5",
        )}
      >
        {result.objective_achieved ? (
          <CheckCircle2 className="size-6 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="size-6 shrink-0 text-red-600" />
        )}
        <div>
          <p className="font-semibold">
            {objective ?? t("detail.reveal.objective")}:{" "}
            {result.objective_achieved
              ? t("detail.reveal.yes")
              : t("detail.reveal.no")}
          </p>
          <p className="text-sm text-muted-foreground">
            {result.objective_explanation}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <Quote className="size-4 text-primary" />{" "}
          {t("detail.reveal.prospectThinking")}
        </h3>
        <p className="text-sm italic leading-relaxed">
          {result.prospect_thinking}
        </p>
        {result.lost_attention?.at_ms != null && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onJump(result.lost_attention.at_ms as number)}
          >
            <Play /> {t("detail.reveal.lostAttention")} ·{" "}
            {formatClock(result.lost_attention.at_ms)}
          </Button>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Eye className="size-4 text-primary" />{" "}
          {t("detail.reveal.hiddenLayer")}
        </h3>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item.item}
                    className="flex items-start gap-2 text-sm"
                  >
                    {item.uncovered ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <div>
                        {item.item}{" "}
                        <Badge
                          variant="outline"
                          className="ml-1 align-middle text-[10px]"
                        >
                          {item.uncovered
                            ? group.id === "CONVERSION_CONDITION"
                              ? t("detail.reveal.met")
                              : t("detail.reveal.uncovered")
                            : group.id === "CONVERSION_CONDITION"
                              ? t("detail.reveal.notMet")
                              : t("detail.reveal.missed")}
                        </Badge>
                      </div>
                      {item.comment && (
                        <p className="text-xs text-muted-foreground">
                          {item.comment}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!groups.length && (
            <p className="text-sm text-muted-foreground">
              {t("detail.reveal.nothingHidden")}
            </p>
          )}
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-5">
        <Lightbulb className="size-5 shrink-0 text-amber-500" />
        <div>
          <h3 className="font-semibold">
            {t("detail.reveal.whatWouldChange")}
          </h3>
          <p className="mt-1 text-sm">{result.what_would_change_outcome}</p>
        </div>
      </Card>
    </div>
  );
}
