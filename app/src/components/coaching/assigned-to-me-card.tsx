import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ClipboardList, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentStatusBadge } from "@/components/coaching/assignment-status-badge";
import { useMyAssignments } from "@/features/coaching/hooks/use-coaching";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";

// Students' open practice assignments (§10.1c). Start opens the practice flow with the assignment attached, so
// the session counts toward it.
export function AssignedToMeCard({ className }: { className?: string }) {
    const { t } = useTranslation("coaching");
    const { data } = useMyAssignments();
    if (!data?.length) return null;

    return (
        <Card className={className ?? "gap-0 p-5"}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <ClipboardList className="size-4 text-primary" /> {t("assignedToMe.title")}
            </h2>
            <ul className="divide-y">
                {data.map((assignment) => (
                    <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-medium">
                                <span className="truncate">{assignment.title}</span>
                                <AssignmentStatusBadge status={assignment.status} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {assignment.practice_agent_name}
                                {assignment.due_at && ` · ${t("student.due", { date: formatDate(assignment.due_at) })}`}
                                {` · ${t("student.attempts", { done: assignment.attempts_count, required: assignment.required_attempts })}`}
                                {assignment.target_score != null && ` · ${t("assignedToMe.target", { score: assignment.target_score })}`}
                            </p>
                            {assignment.instructions && <p className="mt-1 line-clamp-2 text-xs">{assignment.instructions}</p>}
                        </div>
                        {assignment.can_start && assignment.practice_agent_id ? (
                            <Button asChild size="sm">
                                <Link to={`${Routes.practice.start(assignment.practice_agent_id)}?assignment=${assignment.id}`}>
                                    <Play /> {t("assignedToMe.start")}
                                </Link>
                            </Button>
                        ) : (
                            <span className="text-xs text-muted-foreground">{t("assignedToMe.unavailable")}</span>
                        )}
                    </li>
                ))}
            </ul>
        </Card>
    );
}
