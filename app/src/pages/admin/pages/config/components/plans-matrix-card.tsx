import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AppConfigEntry, PlanDefinitionsValue } from "@/features/app-config/interfaces/app-config.interfaces";
import { PlanKeys, type PlanFeature, type PlanKey, type PlanLimits } from "@/features/billing/interfaces/billing.interfaces";
import { PlanFeatureOptions, PlanLimitOptions } from "@/config/constants/dropdowns/billing/plan-feature.options";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { ConfigKeyCard } from "./config-key-card";
import { useConfigDraft } from "../hooks/use-config-draft";

const PLANS: PlanKey[] = [PlanKeys.TRIAL, PlanKeys.STARTER, PlanKeys.PRO, PlanKeys.COACH];

// Limits and feature flags per plan (requirement 3). An empty number means unlimited (null); the server rejects
// invalid combinations (e.g. an owner reserve above the pool, a cap below 1 minute).
export function PlansMatrixCard({ entry }: { entry: AppConfigEntry<PlanDefinitionsValue> }) {
    const { t } = useTranslation("admin");
    const { draft, setDraft, dirty, discard } = useConfigDraft(entry.value, entry.version);
    if (!draft) return null;

    const setLimit = (plan: PlanKey, key: string, value: number | boolean | null) =>
        setDraft({ ...draft, [plan]: { ...draft[plan], limits: { ...draft[plan].limits, [key]: value } } });
    const setFeature = (plan: PlanKey, feature: PlanFeature, value: boolean) =>
        setDraft({ ...draft, [plan]: { ...draft[plan], features: { ...draft[plan].features, [feature]: value } } });

    return (
        <ConfigKeyCard entry={entry} title={t("config.plans.title")} draft={draft} dirty={dirty} onDiscard={discard}>
            <p className="mb-3 text-xs text-muted-foreground">{t("config.plans.hint")}</p>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-56">{t("config.plans.limit")}</TableHead>
                            {PLANS.map((plan) => (
                                <TableHead key={plan} className="min-w-28 text-center">
                                    {getPlanLabel(plan)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {PlanLimitOptions.map((limit) => (
                            <TableRow key={limit.id}>
                                <TableCell className="text-sm">{limit.label}</TableCell>
                                {PLANS.map((plan) => {
                                    const value = draft[plan].limits[limit.id as keyof PlanLimits];
                                    return (
                                        <TableCell key={plan} className="text-center">
                                            {limit.unit === "boolean" ? (
                                                <Switch
                                                    checked={!!value}
                                                    onCheckedChange={(checked) => setLimit(plan, limit.id, checked)}
                                                    aria-label={`${limit.label} · ${getPlanLabel(plan)}`}
                                                />
                                            ) : (
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    inputMode="numeric"
                                                    className="h-8 text-center tabular-nums"
                                                    value={value == null ? "" : String(value)}
                                                    placeholder={limit.id.includes("reserved") ? t("config.plans.none") : t("config.plans.unlimited")}
                                                    aria-label={`${limit.label} · ${getPlanLabel(plan)}`}
                                                    onChange={(event) =>
                                                        setLimit(plan, limit.id, event.target.value === "" ? null : Number(event.target.value))
                                                    }
                                                />
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={PLANS.length + 1} className="bg-muted/40 text-xs font-semibold uppercase tracking-wide">
                                {t("config.plans.features")}
                            </TableCell>
                        </TableRow>
                        {PlanFeatureOptions.map((feature) => (
                            <TableRow key={feature.id}>
                                <TableCell className="text-sm">{feature.label}</TableCell>
                                {PLANS.map((plan) => (
                                    <TableCell key={plan} className="text-center">
                                        <Switch
                                            checked={!!draft[plan].features[feature.id]}
                                            onCheckedChange={(checked) => setFeature(plan, feature.id, checked)}
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
