import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DashboardOverview,
  GroupStat,
} from "@/features/dashboard/interfaces/dashboard.interfaces";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getScenarioTypeLabel } from "@/config/constants/dropdowns/practice/scenario-type-form.options";
import { ScoreBadge } from "@/components/ui/score-badge";

type View = "difficulty" | "temperature" | "scenario" | "copilot";

export function PracticeProgressCard({
  progress,
}: {
  progress: DashboardOverview["practice_progress"];
}) {
  const { t } = useTranslation("dashboard");
  const [view, setView] = useState<View>("difficulty");

  const rows: { label: string; stat: GroupStat }[] =
    view === "difficulty"
      ? progress.by_difficulty.map((stat) => ({
          label: getDifficultyLabel(stat.key),
          stat,
        }))
      : view === "temperature"
        ? progress.by_temperature.map((stat) => ({
            label: getLeadTemperatureLabel(stat.key),
            stat,
          }))
        : view === "scenario"
          ? progress.by_scenario.map((stat) => ({
              label: getScenarioTypeLabel(stat.key),
              stat,
            }))
          : [
              { label: t("practiceProgress.withCopilot"), stat: progress.with_copilot },
              { label: t("practiceProgress.onYourOwn"), stat: progress.without_copilot },
            ];

  return (
    <Card className="p-5">
      <h2 className="font-semibold">{t("practiceProgress.title")}</h2>
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as View)}
        className="mt-3"
      >
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="difficulty" className="px-1 text-xs">
            {t("practiceProgress.tabs.level")}
          </TabsTrigger>
          <TabsTrigger value="temperature" className="px-1 text-xs">
            {t("practiceProgress.tabs.lead")}
          </TabsTrigger>
          <TabsTrigger value="scenario" className="px-1 text-xs">
            {t("practiceProgress.tabs.scenario")}
          </TabsTrigger>
          <TabsTrigger value="copilot" className="px-1 text-xs">
            {t("practiceProgress.tabs.copilot")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {!rows.some((row) => row.stat.sessions) ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("practiceProgress.empty")}
        </p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">{t("practiceProgress.columns.group")}</th>
              <th className="py-1 text-right font-medium">{t("practiceProgress.columns.sessions")}</th>
              <th className="py-1 text-right font-medium">{t("practiceProgress.columns.won")}</th>
              <th className="py-1 text-right font-medium">{t("practiceProgress.columns.avg")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, stat }) => (
              <tr key={label} className="border-t">
                <td className="py-2">{label}</td>
                <td className="py-2 text-right tabular-nums">
                  {stat.sessions}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {stat.objective_rate != null
                    ? `${stat.objective_rate}%`
                    : "–"}
                </td>
                <td className="py-2 text-right">
                  <ScoreBadge score={stat.average_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
