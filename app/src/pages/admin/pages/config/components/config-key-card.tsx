import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, History, RotateCcw, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { formatDateTime } from "@/lib/date";
import type { AppConfigEntry } from "@/features/app-config/interfaces/app-config.interfaces";
import { useResetAppConfig, useUpdateAppConfig } from "@/features/app-config/hooks/use-app-config";
import { ConfigHistorySheet } from "./config-history-sheet";

interface ConfigKeyCardProps<T> {
    entry: AppConfigEntry<T>;
    // The editor's current draft; null while it is invalid (e.g. unparsable JSON).
    draft: T | null;
    dirty: boolean;
    onDiscard: () => void;
    title?: string;
    children: ReactNode;
}

// One AppConfig key: its editor plus save (optimistic version), reset to default and the audit trail.
export function ConfigKeyCard<T>({ entry, draft, dirty, onDiscard, title, children }: ConfigKeyCardProps<T>) {
    const { t } = useTranslation("admin");
    const update = useUpdateAppConfig();
    const reset = useResetAppConfig();
    const [historyOpen, setHistoryOpen] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    return (
        <Card className="gap-0 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-semibold">{title ?? entry.key}</h3>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        <code>{entry.key}</code> ·{" "}
                        {entry.version
                            ? t("config.updated", {
                                  version: entry.version,
                                  date: entry.updated_at ? formatDateTime(entry.updated_at) : "—",
                                  name: entry.updated_by?.name ?? t("config.system"),
                              })
                            : t("config.usingDefault")}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {entry.public && <Badge variant="outline">{t("config.public")}</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
                        <History /> {t("config.history")}
                    </Button>
                </div>
            </div>
            {entry.invalid && (
                <p className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>
                        {t("config.invalid")}
                        {entry.validation_error && <span className="mt-1 block font-mono text-xs text-muted-foreground">{entry.validation_error}</span>}
                    </span>
                </p>
            )}
            {children}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                <Button
                    size="sm"
                    disabled={!dirty || draft === null || update.isPending}
                    loading={update.isPending}
                    onClick={() => draft !== null && update.mutate({ key: entry.key, value: draft, version: entry.version })}
                >
                    {!update.isPending && <Save />} {t("config.save")}
                </Button>
                {dirty && (
                    <Button size="sm" variant="ghost" onClick={onDiscard} disabled={update.isPending}>
                        {t("config.discard")}
                    </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setConfirmReset(true)} disabled={!entry.version}>
                    <RotateCcw /> {t("config.reset")}
                </Button>
            </div>
            <ConfigHistorySheet configKey={historyOpen ? entry.key : null} onClose={() => setHistoryOpen(false)} />
            <ConfirmationDialog
                isOpen={confirmReset}
                onClose={() => setConfirmReset(false)}
                onConfirm={() => reset.mutate({ key: entry.key, version: entry.version }, { onSuccess: () => setConfirmReset(false) })}
                title={t("config.resetTitle")}
                description={t("config.resetDescription", { key: entry.key })}
                confirmText={t("config.reset")}
                variant="destructive"
                isLoading={reset.isPending}
            />
        </Card>
    );
}
