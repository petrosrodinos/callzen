import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AnalysisVisibilityValue, AppConfigEntry } from "@/features/app-config/interfaces/app-config.interfaces";
import { PlanKeys, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";
import { AnalysisFeatureOptions } from "@/config/constants/dropdowns/billing/analysis-feature.options";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { ConfigKeyCard } from "./config-key-card";
import { useConfigDraft } from "../hooks/use-config-draft";

const PLANS: PlanKey[] = [PlanKeys.TRIAL, PlanKeys.STARTER, PlanKeys.PRO, PlanKeys.COACH];

// Plan × analysis section matrix (§9.2). The full analysis is always stored; this only controls what is served.
export function AnalysisVisibilityCard({ entry }: { entry: AppConfigEntry<AnalysisVisibilityValue> }) {
    const { t } = useTranslation("admin");
    const { draft, setDraft, dirty, discard } = useConfigDraft(entry.value, entry.version);
    if (!draft) return null;

    return (
        <ConfigKeyCard entry={entry} title={t("config.analysis.title")} draft={draft} dirty={dirty} onDiscard={discard}>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-56">{t("config.analysis.section")}</TableHead>
                            {PLANS.map((plan) => (
                                <TableHead key={plan} className="text-center">
                                    {getPlanLabel(plan)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {AnalysisFeatureOptions.map((feature) => (
                            <TableRow key={feature.id}>
                                <TableCell>
                                    <p className="text-sm">{feature.label}</p>
                                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                                </TableCell>
                                {PLANS.map((plan) => (
                                    <TableCell key={plan} className="text-center">
                                        <Checkbox
                                            checked={!!draft[plan]?.[feature.id]}
                                            onCheckedChange={(checked) =>
                                                setDraft({ ...draft, [plan]: { ...draft[plan], [feature.id]: checked === true } })
                                            }
                                            aria-label={`${feature.label} · ${getPlanLabel(plan)}`}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ConfigKeyCard>
    );
}
