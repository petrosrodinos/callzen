import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatDuration } from "@/lib/date";
import type { StudentDetail } from "@/features/coaching/interfaces/coaching.interfaces";
import { getCallKindLabel } from "@/config/constants/dropdowns/calls/call-kind-filter.options";
import { getCallOutcomeLabel } from "@/config/constants/dropdowns/calls/call-outcome-form.options";
import { Routes } from "@/routes/routes";

export function StudentCallsCard({ calls }: { calls: StudentDetail["recent_calls"] }) {
    const { t } = useTranslation("coaching");
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("student.recentCalls")}</h2>
            {!calls.length ? (
                <p className="text-sm text-muted-foreground">{t("student.noCalls")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("student.columns.call")}</TableHead>
                                <TableHead>{t("student.columns.kind")}</TableHead>
                                <TableHead>{t("student.columns.date")}</TableHead>
                                <TableHead>{t("student.columns.duration")}</TableHead>
                                <TableHead>{t("student.columns.outcome")}</TableHead>
                                <TableHead>{t("student.columns.score")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calls.map((call) => (
                                <TableRow key={call.id}>
                                    <TableCell className="max-w-60 truncate">
                                        <Link to={Routes.library.detail(call.id)} className="font-medium hover:underline">
                                            {call.title || t("student.untitledCall")}
                                        </Link>
                                        {call.assignment_id && (
                                            <ClipboardList className="ml-1.5 inline size-3.5 text-muted-foreground" aria-label={t("student.fromAssignment")} />
                                        )}
                                    </TableCell>
                                    <TableCell>{getCallKindLabel(call.kind)}</TableCell>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(call.started_at)}</TableCell>
                                    <TableCell className="tabular-nums">{formatDuration(call.duration_seconds)}</TableCell>
                                    <TableCell>{call.outcome ? getCallOutcomeLabel(call.outcome) : "—"}</TableCell>
                                    <TableCell>
                                        <ScoreBadge score={call.score} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
