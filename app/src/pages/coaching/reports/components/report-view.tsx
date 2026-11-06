import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, ClipboardCheck, Timer, TrendingUp, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { formatDate } from "@/lib/date";
import type { ReportDetail } from "@/features/coaching/interfaces/coaching.interfaces";
import { Routes } from "@/routes/routes";

function Section({ icon: Icon, title, children }: { icon: typeof Trophy; title: string; children: ReactNode }) {
    return (
        <Card className="gap-0 p-5">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
                <Icon className="size-4 text-muted-foreground" /> {title}
            </h3>
            {children}
        </Card>
    );
}

// Reports hold numbers and ids only; every sentence is built here in the reader's language (§10.1e).
export function ReportView({ report }: { report: ReportDetail }) {
    const { t } = useTranslation("coaching");
    const { data } = report;
    const name = (userId: string) => (
        <Link to={Routes.coaching.student(userId)} className="font-medium hover:underline">
            {report.users[userId] ?? t("reports.unknownStudent")}
        </Link>
    );
    const assignmentTitle = (id: string) => report.assignments[id] ?? t("reports.unknownAssignment");

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">
                    {t("reports.weekOf", { start: formatDate(report.period_start), end: formatDate(report.period_end) })}
                </h2>
                {data.empty && <p className="text-sm text-muted-foreground">{t("reports.emptyWeek")}</p>}
            </div>

            <Section icon={Timer} title={t("reports.activity")}>
                <ul className="space-y-1 text-sm">
                    <li>{t("reports.sessions", { count: data.totals.sessions, previous: data.totals.sessions_prev })}</li>
                    <li>
                        {t("reports.practiceMinutes", {
                            minutes: formatMinutes(data.totals.practice_minutes),
                            previous: formatMinutes(data.totals.practice_minutes_prev),
                        })}
                    </li>
                    <li>{t("reports.activeStudents", { count: data.totals.active_students, total: data.totals.students })}</li>
                    {data.pool.live?.used_minutes != null && (
                        <li>
                            {data.pool.live.included_minutes != null
                                ? t("reports.poolUsed", { used: formatMinutes(data.pool.live.used_minutes), total: formatMinutes(data.pool.live.included_minutes) })
                                : t("reports.poolUsedUnlimited", { used: formatMinutes(data.pool.live.used_minutes) })}
                            {data.pool.live.owner_reserve_left_minutes != null &&
                                ` · ${t("reports.reserveLeft", { minutes: formatMinutes(data.pool.live.owner_reserve_left_minutes) })}`}
                        </li>
                    )}
                </ul>
            </Section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section icon={TrendingUp} title={t("reports.improved", { threshold: data.improved_threshold })}>
                    {!data.improved.length ? (
                        <p className="text-sm text-muted-foreground">{t("reports.noneImproved")}</p>
                    ) : (
                        <ul className="space-y-1 text-sm">
                            {data.improved.map((item) => (
                                <li key={item.user_id}>
                                    {name(item.user_id)} {t("reports.roseFromTo", { from: item.from ?? "–", to: item.to ?? "–" })}
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
                <Section icon={AlertTriangle} title={t("reports.needsAttention")}>
                    {!data.needs_attention.length ? (
                        <p className="text-sm text-muted-foreground">{t("reports.noneNeedAttention")}</p>
                    ) : (
                        <ul className="space-y-1 text-sm">
                            {data.needs_attention.map((item) => (
                                <li key={`${item.user_id}-${item.reason}`}>
                                    {name(item.user_id)}{" "}
                                    {item.reason === "SCORE_DROP"
                                        ? t("reports.fellFromTo", { from: item.from ?? "–", to: item.to ?? "–" })
                                        : item.last_practice_at
                                          ? t("reports.inactiveSince", { date: formatDate(item.last_practice_at) })
                                          : t("reports.neverPractised", { days: data.inactive_days })}
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
            </div>

            <Section icon={ClipboardCheck} title={t("reports.assignments")}>
                <ul className="space-y-1 text-sm">
                    <li>{t("reports.completedThisWeek", { count: data.assignments.completed_count })}</li>
                    <li>{t("reports.overdueNow", { count: data.assignments.overdue_count })}</li>
                </ul>
                {data.assignments.due_next_7_days.length > 0 && (
                    <div className="mt-3">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <CalendarClock className="size-3.5" /> {t("reports.dueSoon")}
                        </p>
                        <ul className="space-y-1 text-sm">
                            {data.assignments.due_next_7_days.map((item) => (
                                <li key={item.assignment_id}>
                                    <Link to={Routes.coaching.assignment(item.assignment_id)} className="font-medium hover:underline">
                                        {assignmentTitle(item.assignment_id)}
                                    </Link>{" "}
                                    {t("reports.dueOn", { date: formatDate(item.due_at), count: item.open_targets })}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Section icon={Trophy} title={t("reports.topByScore")}>
                    {!data.top_by_score.length ? (
                        <p className="text-sm text-muted-foreground">{t("cohort.leaderboard.empty")}</p>
                    ) : (
                        <ol className="space-y-1 text-sm">
                            {data.top_by_score.map((entry, index) => (
                                <li key={entry.user_id}>
                                    {index + 1}. {name(entry.user_id)} · {Math.round(entry.value)}
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
                <Section icon={Trophy} title={t("reports.topByPractice")}>
                    {!data.top_by_practice_minutes.length ? (
                        <p className="text-sm text-muted-foreground">{t("cohort.leaderboard.empty")}</p>
                    ) : (
                        <ol className="space-y-1 text-sm">
                            {data.top_by_practice_minutes.map((entry, index) => (
                                <li key={entry.user_id}>
                                    {index + 1}. {name(entry.user_id)} · {t("cohort.leaderboard.minutes", { minutes: formatMinutes(entry.value) })}
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
            </div>
        </div>
    );
}
