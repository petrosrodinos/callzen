import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes } from "@/lib/format";
import { formatRelative } from "@/lib/date";
import type { CohortStudent } from "@/features/coaching/interfaces/coaching.interfaces";
import { Routes } from "@/routes/routes";

type SortKey = "name" | "score" | "sessions" | "practice" | "activity";

const sortValue = (student: CohortStudent, key: SortKey): number | string => {
    switch (key) {
        case "name":
            return student.name.toLowerCase();
        case "score":
            return student.average_score ?? -1;
        case "sessions":
            return student.sessions;
        case "practice":
            return student.practice_minutes;
        case "activity":
            return student.last_activity_at ? new Date(student.last_activity_at).getTime() : 0;
    }
};

const minutesWithCap = (used: number, cap: number | null) => (cap == null ? formatMinutes(used) : `${formatMinutes(used)} / ${formatMinutes(cap)}`);

export function StudentsTable({ students, momentsLocked }: { students: CohortStudent[]; momentsLocked: boolean }) {
    const { t } = useTranslation("coaching");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "score", desc: true });

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();
        return students
            .filter((student) => !query || student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query))
            .sort((a, b) => {
                const left = sortValue(a, sort.key);
                const right = sortValue(b, sort.key);
                const result = left < right ? -1 : left > right ? 1 : 0;
                return sort.desc ? -result : result;
            });
    }, [students, search, sort]);

    const header = (key: SortKey, label: string, className?: string) => (
        <TableHead className={className}>
            <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground"
                onClick={() => setSort((current) => ({ key, desc: current.key === key ? !current.desc : key !== "name" }))}
            >
                {label}
                {sort.key === key && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
            </button>
        </TableHead>
    );

    return (
        <Card className="gap-0 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t("cohort.students.title")}</h2>
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("cohort.students.search")}
                    aria-label={t("cohort.students.search")}
                    className="h-9 w-56"
                />
            </div>
            {!students.length ? (
                <p className="text-sm text-muted-foreground">{t("cohort.students.empty")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {header("name", t("cohort.students.student"))}
                                {header("score", t("cohort.students.score"))}
                                {header("sessions", t("cohort.students.sessions"), "text-right")}
                                <TableHead className="text-right">{t("cohort.students.liveMinutes")}</TableHead>
                                {header("practice", t("cohort.students.practiceMinutes"), "text-right")}
                                {!momentsLocked && <TableHead>{t("cohort.students.mistakes")}</TableHead>}
                                {header("activity", t("cohort.students.lastActivity"))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((student) => (
                                <TableRow key={student.user_id}>
                                    <TableCell>
                                        <Link to={Routes.coaching.student(student.user_id)} className="font-medium hover:underline">
                                            {student.name}
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5">
                                            <ScoreBadge score={student.average_score} />
                                            {student.score_change != null && student.score_change !== 0 && (
                                                <span className={student.score_change > 0 ? "text-emerald-600" : "text-red-600"}>
                                                    {student.score_change > 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                                                </span>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{student.sessions}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {minutesWithCap(student.minutes_this_period.live_used, student.minutes_this_period.live_cap)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                        {minutesWithCap(student.minutes_this_period.practice_used, student.minutes_this_period.practice_cap)}
                                    </TableCell>
                                    {!momentsLocked && (
                                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                                            {student.recurring_mistakes?.slice(0, 2).map((mistake) => mistake.label).join(", ") || "—"}
                                        </TableCell>
                                    )}
                                    <TableCell className="whitespace-nowrap">
                                        <span className="text-sm text-muted-foreground">
                                            {student.last_activity_at ? formatRelative(student.last_activity_at) : t("cohort.students.never")}
                                        </span>
                                        {student.inactive && (
                                            <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-700 dark:text-amber-300">
                                                {t("cohort.students.inactive")}
                                            </Badge>
                                        )}
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
