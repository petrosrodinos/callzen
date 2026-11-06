import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date";
import { useAppConfigHistory } from "@/features/app-config/hooks/use-app-config";

const pretty = (value: unknown) => (value === null || value === undefined ? "—" : JSON.stringify(value, null, 2));

// Who changed a setting, when, and what it was before (AppConfigHistory).
export function ConfigHistorySheet({ configKey, onClose }: { configKey: string | null; onClose: () => void }) {
    const { t } = useTranslation("admin");
    const { data, isPending } = useAppConfigHistory(configKey);
    return (
        <Sheet open={!!configKey} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>{t("config.historyTitle")}</SheetTitle>
                    <SheetDescription>
                        <code>{configKey}</code>
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                    {isPending ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
                    ) : !data?.length ? (
                        <p className="text-sm text-muted-foreground">{t("config.noHistory")}</p>
                    ) : (
                        data.map((row) => (
                            <div key={row.id} className="rounded-lg border p-3 text-sm">
                                <p className="mb-2 text-xs text-muted-foreground">
                                    {formatDateTime(row.created_at)} · {row.changed_by?.name ?? t("config.system")}
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                        <p className="mb-1 text-xs font-medium">{t("config.before")}</p>
                                        <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-[11px]">{pretty(row.old_value)}</pre>
                                    </div>
                                    <div>
                                        <p className="mb-1 text-xs font-medium">{t("config.after")}</p>
                                        <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-[11px]">{pretty(row.new_value)}</pre>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
