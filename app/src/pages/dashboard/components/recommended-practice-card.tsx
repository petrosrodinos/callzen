import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dumbbell, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RecommendedPractice } from "@/features/dashboard/interfaces/dashboard.interfaces";
import { useStartRecommendedPractice } from "@/hooks/use-start-recommended-practice";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { Routes } from "@/routes/routes";

export function RecommendedPracticeCard({
  items,
  canStart,
}: {
  items: RecommendedPractice[];
  canStart: boolean;
}) {
  const { t } = useTranslation("dashboard");
  const { start, isPending, pendingTitle } = useStartRecommendedPractice();

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Dumbbell className="size-4 text-primary" /> {t("recommended.title")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("recommended.subtitle")}
      </p>
      {!items.length ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            {t("recommended.empty")}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to={Routes.practice.root}>{t("recommended.browse")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const loading =
              isPending && pendingTitle === item.scenario_description;
            return (
              <li
                key={`${item.title}-${item.call_id}`}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.focus}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {getLeadTemperatureLabel(item.lead_temperature)}
                    </Badge>
                    <Badge variant="secondary">
                      {getDifficultyLabel(item.difficulty)}
                    </Badge>
                  </div>
                </div>
                {canStart && (
                  <Button
                    size="sm"
                    onClick={() => start(item)}
                    disabled={isPending}
                    className="shrink-0"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Play />}
                    {loading ? t("recommended.preparing") : t("recommended.practice")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
