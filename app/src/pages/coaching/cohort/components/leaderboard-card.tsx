import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import type { LeaderboardEntry } from "@/features/coaching/interfaces/coaching.interfaces";
import { Routes } from "@/routes/routes";

export function LeaderboardCard({
    title,
    entries,
    unit,
}: {
    title: string;
    entries: LeaderboardEntry[];
    unit: "score" | "minutes";
}) {
    const { t } = useTranslation("coaching");
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <Trophy className="size-4 text-amber-500" /> {title}
            </h2>
            {!entries.length ? (
                <p className="text-sm text-muted-foreground">{t("cohort.leaderboard.empty")}</p>
            ) : (
                <ol className="space-y-2">
                    {entries.slice(0, 5).map((entry, index) => (
                        <li key={entry.user_id} className="flex items-center gap-3 text-sm">
                            <span className="w-5 text-right font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                            <Link to={Routes.coaching.student(entry.user_id)} className="flex-1 truncate hover:underline">
                                {entry.name}
                            </Link>
                            <span className="tabular-nums font-medium">
                                {unit === "score" ? Math.round(entry.value) : t("cohort.leaderboard.minutes", { minutes: formatMinutes(entry.value) })}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
