import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCost, formatNumber } from "@/lib/format";
import type { UsageSummary } from "@/features/usage/interfaces/usage.interfaces";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import { getUsageKindLabel } from "@/config/constants/dropdowns/usage/usage-kind.options";

// Platform admins only (§6.2): costs are omitted from the API for everyone else.
export function AdminCostBreakdown({ summary, catalog }: { summary: UsageSummary; catalog: Catalog | undefined }) {
    const { t } = useTranslation("settings");
    const modelLabel = (id: string) =>
        catalog?.ai_models?.find((m) => m.id === id)?.label ?? catalog?.audio_models?.find((m) => m.id === id)?.label ?? id;

    return (
        <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="size-3.5" /> {t("usage.admin.title")}
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <h2 className="mb-3 font-semibold">{t("usage.byActivity")}</h2>
                    {!summary.by_kind?.length ? (
                        <p className="text-sm text-muted-foreground">{t("usage.empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {[...summary.by_kind]
                                .sort((a, b) => b.cost_usd - a.cost_usd)
                                .map((row) => (
                                    <li key={row.kind} className="flex items-center justify-between gap-2 text-sm">
                                        <span>{getUsageKindLabel(row.kind)}</span>
                                        <span className="tabular-nums text-muted-foreground">
                                            {row.count} · <span className="font-medium text-foreground">{formatCost(row.cost_usd)}</span>{" "}
                                            <span className="text-xs">({formatCost(row.base_cost_usd)})</span>
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    )}
                </Card>
                <Card className="p-5">
                    <h2 className="mb-3 font-semibold">{t("usage.byModel")}</h2>
                    {!summary.by_model?.length ? (
                        <p className="text-sm text-muted-foreground">{t("usage.empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {[...summary.by_model]
                                .sort((a, b) => b.cost_usd - a.cost_usd)
                                .map((row) => (
                                    <li key={row.model} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate">{modelLabel(row.model)}</span>
                                        <span className="shrink-0 tabular-nums text-muted-foreground">
                                            {t("usage.tokens", { tokens: formatNumber(row.input_tokens + row.output_tokens) })} ·{" "}
                                            <span className="font-medium text-foreground">{formatCost(row.cost_usd)}</span>
                                        </span>
                                    </li>
                                ))}
                        </ul>
                    )}
                </Card>
            </div>
            <p className="text-xs text-muted-foreground">{t("usage.admin.chargedVsBase")}</p>
        </div>
    );
}
