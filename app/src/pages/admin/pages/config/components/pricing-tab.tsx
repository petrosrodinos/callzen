import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatRelative } from "@/lib/date";
import { usePricingOverview, useSyncPricing, useUpdateAppConfig } from "@/features/app-config/hooks/use-app-config";
import {
    AppConfigKeys,
    type AppConfigEntry,
    type ModelOverridesValue,
} from "@/features/app-config/interfaces/app-config.interfaces";
import { PricingSources, type ModelUnitPrices } from "@/features/catalog/interfaces/catalog.interfaces";
import { getPricingSourceLabel } from "@/config/constants/dropdowns/billing/pricing-source.options";
import { ConfigKeyCard } from "./config-key-card";
import { JsonConfigCard } from "./json-config-card";
import { useConfigDraft } from "../hooks/use-config-draft";

const PRICE_FIELDS: (keyof ModelUnitPrices)[] = ["input", "output", "cache_read", "input_audio", "output_audio", "per_minute"];

const sourceVariant = (source: string): "success" | "secondary" | "destructive" | "outline" =>
    source === PricingSources.MODELS_DEV ? "success" : source === PricingSources.UNPRICED ? "destructive" : source === PricingSources.ADMIN_OVERRIDE ? "secondary" : "outline";

const price = (value: number | undefined) => (value == null ? "—" : `$${value}`);

function MarkupCard({ entry }: { entry: AppConfigEntry<number> }) {
    const { t } = useTranslation("admin");
    const { draft, setDraft, dirty, discard } = useConfigDraft(entry.value, entry.version);
    return (
        <ConfigKeyCard entry={entry} title={t("config.pricing.markupTitle")} draft={draft ?? null} dirty={dirty} onDiscard={discard}>
            <div className="flex max-w-xs items-center gap-2">
                <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={draft ?? 0}
                    onChange={(event) => setDraft(Number(event.target.value))}
                    aria-label={t("config.pricing.markupTitle")}
                />
                <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("config.pricing.markupHint")}</p>
        </ConfigKeyCard>
    );
}

// Adds or edits a manual price for one model (pricing.model_overrides); used for models models.dev doesn't price.
function OverrideDialog({ modelId, overrides, onClose }: { modelId: string | null; overrides: AppConfigEntry<ModelOverridesValue>; onClose: () => void }) {
    const { t } = useTranslation("admin");
    const update = useUpdateAppConfig();
    const [values, setValues] = useState<Record<string, string>>({});
    const current = modelId ? (overrides.value[modelId] ?? {}) : {};
    const read = (field: keyof ModelUnitPrices) => values[field] ?? (current[field] != null ? String(current[field]) : "");

    const save = () => {
        if (!modelId) return;
        const next: ModelUnitPrices = {};
        for (const field of PRICE_FIELDS) {
            const raw = read(field);
            if (raw !== "") next[field] = Number(raw);
        }
        update.mutate(
            { key: overrides.key, value: { ...overrides.value, [modelId]: next }, version: overrides.version },
            {
                onSuccess: () => {
                    setValues({});
                    onClose();
                },
            },
        );
    };

    return (
        <Dialog open={!!modelId} onOpenChange={(open) => !open && !update.isPending && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("config.pricing.overrideTitle", { model: modelId })}</DialogTitle>
                    <DialogDescription>{t("config.pricing.overrideHint")}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    {PRICE_FIELDS.map((field) => (
                        <div key={field} className="space-y-1">
                            <Label htmlFor={`override-${field}`}>{t(`config.pricing.fields.${field}`)}</Label>
                            <Input
                                id={`override-${field}`}
                                type="number"
                                min={0}
                                step="any"
                                value={read(field)}
                                onChange={(event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))}
                            />
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={update.isPending}>
                        {t("config.cancel")}
                    </Button>
                    <Button onClick={save} loading={update.isPending}>
                        {t("config.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function PricingTab({ entries }: { entries: AppConfigEntry[] }) {
    const { t } = useTranslation("admin");
    const { data, isPending } = usePricingOverview();
    const sync = useSyncPricing();
    const [overrideFor, setOverrideFor] = useState<string | null>(null);
    const byKey = (key: string) => entries.find((entry) => entry.key === key);
    const markup = byKey(AppConfigKeys.MARKUP_PERCENT) as AppConfigEntry<number> | undefined;
    const overrides = byKey(AppConfigKeys.MODEL_OVERRIDES) as AppConfigEntry<ModelOverridesValue> | undefined;

    return (
        <div className="space-y-4">
            {markup && <MarkupCard entry={markup} />}

            <Card className="gap-0 p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold">{t("config.pricing.pricesTitle")}</h3>
                        <p className="text-sm text-muted-foreground">{t("config.pricing.pricesDescription")}</p>
                        {data && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {data.last_fetched_at
                                    ? t("config.pricing.lastSynced", { when: formatRelative(data.last_fetched_at) })
                                    : t("config.pricing.neverSynced")}
                                {data.sync.last_error && ` · ${t("config.pricing.lastError", { error: data.sync.last_error })}`}
                            </p>
                        )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending || data?.sync.running}>
                        <RefreshCw className={sync.isPending ? "animate-spin" : undefined} /> {t("config.pricing.syncNow")}
                    </Button>
                </div>
                {data?.snapshot_is_old && (
                    <p className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="size-4 shrink-0" /> {t("config.pricing.snapshotOld")}
                    </p>
                )}
                {isPending || !data ? (
                    <Skeleton className="h-48 w-full rounded-lg" />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("config.pricing.model")}</TableHead>
                                    <TableHead>{t("config.pricing.source")}</TableHead>
                                    {PRICE_FIELDS.map((field) => (
                                        <TableHead key={field} className="text-right">
                                            {t(`config.pricing.fields.${field}`)}
                                        </TableHead>
                                    ))}
                                    <TableHead>{t("config.pricing.fetched")}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.prices.map((row) => (
                                    <TableRow key={row.model_id}>
                                        <TableCell className="font-mono text-xs">{row.model_id}</TableCell>
                                        <TableCell>
                                            <Badge variant={sourceVariant(row.source)} title={row.resolved_from ?? undefined}>
                                                {getPricingSourceLabel(row.source)}
                                            </Badge>
                                            {row.stale && (
                                                <Badge variant="outline" className="ml-1">
                                                    {t("config.pricing.stale")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        {PRICE_FIELDS.map((field) => (
                                            <TableCell key={field} className="text-right tabular-nums">
                                                {price(row.unit_prices[field])}
                                            </TableCell>
                                        ))}
                                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                            {row.fetched_at ? formatDateTime(row.fetched_at) : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {overrides && row.source !== PricingSources.MODELS_DEV && (
                                                <Button size="sm" variant="ghost" onClick={() => setOverrideFor(row.model_id)}>
                                                    {t("config.pricing.override")}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {!!data?.unpriced_models.length && (
                <Card className="gap-0 border-destructive/40 p-5">
                    <h3 className="font-semibold">{t("config.pricing.unpricedTitle")}</h3>
                    <p className="mb-3 text-sm text-muted-foreground">{t("config.pricing.unpricedDescription")}</p>
                    <ul className="divide-y">
                        {data.unpriced_models.map((model) => (
                            <li key={model.model_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                <span>
                                    <span className="font-mono text-xs">{model.model_id}</span>
                                    {model.events > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {t("config.pricing.unpricedEvents", { count: model.events })}
                                        </span>
                                    )}
                                </span>
                                {overrides && (
                                    <Button size="sm" variant="outline" onClick={() => setOverrideFor(model.model_id)}>
                                        <Plus /> {t("config.pricing.addOverride")}
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {overrides && <JsonConfigCard entry={overrides} title={t("config.pricing.overridesTitle")} />}
            {[AppConfigKeys.AUDIO_TOKENS_PER_MINUTE, AppConfigKeys.PRICING_SYNC].map((key) => {
                const entry = byKey(key);
                return entry ? <JsonConfigCard key={key} entry={entry} /> : null;
            })}
            {overrides && <OverrideDialog modelId={overrideFor} overrides={overrides} onClose={() => setOverrideFor(null)} />}
        </div>
    );
}
