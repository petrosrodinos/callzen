import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProspectInsights } from "@/features/calls/interfaces/calls.interfaces";
import { InterestLevelOptions } from "@/config/constants/dropdowns/calls/analysis-labels.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";

const INTEREST_STYLES = {
  LOW: "bg-red-500/10 text-red-700 dark:text-red-300",
  MEDIUM: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  HIGH: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const List = ({ title, items }: { title: string; items: string[] }) => {
  const { t } = useTranslation("library");
  return (
    <Card className="p-4">
      <h4 className="mb-2 text-sm font-semibold">{title}</h4>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("detail.insights.noneIdentified")}
        </p>
      )}
    </Card>
  );
};

export function AnalysisInsights({ insights }: { insights: ProspectInsights }) {
  const { t } = useTranslation("library");
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-semibold">{t("detail.insights.summary")}</h3>
          <Badge
            className={`shadow-none ${INTEREST_STYLES[insights.interest_level]}`}
          >
            {getDropdownOptionLabel(
              InterestLevelOptions,
              insights.interest_level,
            )}
          </Badge>
        </div>
        <p className="text-sm">{insights.summary}</p>
      </Card>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <List title={t("detail.insights.needs")} items={insights.needs} />
        <List
          title={t("detail.insights.painPoints")}
          items={insights.pain_points}
        />
        <List
          title={t("detail.insights.objections")}
          items={insights.objections}
        />
        <List
          title={t("detail.insights.buyingSignals")}
          items={insights.buying_signals}
        />
      </div>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">{t("detail.insights.keyInfo")}</h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {(
            [
              ["budget", insights.budget],
              ["timeline", insights.timeline],
              ["decisionMakers", insights.decision_makers],
              ["competitors", insights.competitors],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`detail.insights.fields.${label}`)}
              </dt>
              <dd>{value || t("detail.insights.notDiscussed")}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
