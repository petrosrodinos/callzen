import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardCategory } from "@/features/dashboard/interfaces/dashboard.interfaces";

export function SkillsCard({
  categories,
}: {
  categories: DashboardCategory[];
}) {
  const { t } = useTranslation("dashboard");
  const sorted = [...categories].sort(
    (a, b) => (a.average ?? 0) - (b.average ?? 0),
  );

  return (
    <Card className="p-5">
      <h2 className="font-semibold">{t("skills.title")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("skills.subtitle")}
      </p>
      {!sorted.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("skills.empty")}
        </p>
      ) : (
        <ul className="space-y-3.5">
          {sorted.map((category) => (
            <li key={category.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{category.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {category.change_percent != null &&
                    category.change_percent !== 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium",
                          category.change_percent > 0
                            ? "text-emerald-600"
                            : "text-red-600",
                        )}
                      >
                        {category.change_percent > 0 ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {Math.abs(category.change_percent)}%
                      </span>
                    )}
                  <span className="w-8 text-right font-semibold tabular-nums">
                    {category.average ?? "–"}
                  </span>
                </span>
              </div>
              <div className="space-y-1">
                <Bar
                  value={category.live_average}
                  className="bg-[var(--chart-1)]"
                  label={t("skills.live")}
                />
                <Bar
                  value={category.practice_average}
                  className="bg-[var(--chart-2)]"
                  label={t("skills.practice")}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Bar({
  value,
  className,
  label,
}: {
  value: number | null;
  className: string;
  label: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-2" title={`${label}: ${value}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", className)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-14 text-[11px] text-muted-foreground">
        {label} {value}
      </span>
    </div>
  );
}
