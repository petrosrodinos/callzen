import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCost, formatMinutes } from "@/lib/format";
import { formatDateTime } from "@/lib/date";
import type { UsageSession, UsageSummary } from "@/features/usage/interfaces/usage.interfaces";
import { getCallKindLabel } from "@/config/constants/dropdowns/calls/call-kind-filter.options";
import { Routes } from "@/routes/routes";

type SortKey = "started_at" | "duration" | "cost";

// Minutes per session for everyone; the cost column only appears for platform admins (§6.1, §6.2).
export function SessionsTable({ summary, showOwner }: { summary: UsageSummary; showOwner: boolean }) {
    const { t } = useTranslation("settings");
    const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "started_at", desc: true });
    const costs = useMemo(
        () => new Map(summary.cost_per_session?.sessions.map((session) => [session.call_id, session]) ?? []),
        [summary.cost_per_session],
    );
    const showCost = !!summary.cost_per_session;

    const rows = useMemo(() => {
        const value = (session: UsageSession) =>
            sort.key === "duration"
                ? session.duration_seconds
                : sort.key === "cost"
                  ? (costs.get(session.id)?.charged_usd ?? 0)
                  : new Date(session.started_at).getTime();
        return [...summary.sessions].sort((a, b) => (sort.desc ? value(b) - value(a) : value(a) - value(b)));
    }, [summary.sessions, sort, costs]);

    const header = (key: SortKey, label: string, className?: string) => (
        <TableHead className={className}>
            <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground"
                onClick={() => setSort((current) => ({ key, desc: current.key === key ? !current.desc : true }))}
            >
                {label}
                {sort.key === key && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
            </button>
        </TableHead>
    );

    return (
        <Card className="gap-0 p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{t("usage.sessions.title")}</h2>
                <p className="text-sm text-muted-foreground">
                    {t("usage.sessions.average", { minutes: formatMinutes(summary.average_session_minutes) })}
                    {showCost && ` · ${t("usage.admin.averageCost", { cost: formatCost(summary.cost_per_session?.average_usd ?? 0) })}`}
                </p>
            </div>
            {!rows.length ? (
                <p className="text-sm text-muted-foreground">{t("usage.empty")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("usage.sessions.session")}</TableHead>
                                {showOwner && <TableHead>{t("usage.sessions.member")}</TableHead>}
                                <TableHead>{t("usage.sessions.kind")}</TableHead>
                                {header("started_at", t("usage.sessions.date"))}
                                {header("duration", t("usage.sessions.minutes"), "text-right")}
                                {showCost && header("cost", t("usage.admin.cost"), "text-right")}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((session) => {
                                const cost = costs.get(session.id);
                                return (
                                    <TableRow key={session.id}>
                                        <TableCell className="max-w-56 truncate font-medium">
                                            <Link to={Routes.library.detail(session.id)} className="hover:underline">
                                                {session.title || t("usage.sessions.untitled")}
                                            </Link>
                                        </TableCell>
                                        {showOwner && <TableCell>{session.owner.is_you ? t("usage.sessions.you") : session.owner.name}</TableCell>}
                                        <TableCell>{getCallKindLabel(session.kind)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(session.started_at)}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatMinutes(session.duration_seconds / 60)}</TableCell>
                                        {showCost && (
                                            <TableCell className="text-right tabular-nums" title={cost ? t("usage.admin.baseCost", { cost: formatCost(cost.base_usd) }) : undefined}>
                                                {cost ? formatCost(cost.charged_usd) : "—"}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
