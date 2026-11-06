import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AssignmentStatusBadge } from "@/components/coaching/assignment-status-badge";
import { formatDate } from "@/lib/date";
import type { StudentDetail } from "@/features/coaching/interfaces/coaching.interfaces";
import { Routes } from "@/routes/routes";

export function StudentAssignmentsCard({ assignments }: { assignments: StudentDetail["assignments"] }) {
    const { t } = useTranslation("coaching");
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("student.assignments")}</h2>
            {!assignments.length ? (
                <p className="text-sm text-muted-foreground">{t("student.noAssignments")}</p>
            ) : (
                <ul className="divide-y">
                    {assignments.map((assignment) => (
                        <li key={assignment.id} className="flex items-center justify-between gap-3 py-2">
                            <div className="min-w-0">
                                <Link to={Routes.coaching.assignment(assignment.id)} className="block truncate text-sm font-medium hover:underline">
                                    {assignment.title}
                                </Link>
                                <p className="text-xs text-muted-foreground">
                                    {t("student.attempts", { done: assignment.attempts_count, required: assignment.required_attempts })}
                                    {assignment.best_score != null && ` · ${t("student.best", { score: assignment.best_score })}`}
                                    {assignment.due_at && ` · ${t("student.due", { date: formatDate(assignment.due_at) })}`}
                                </p>
                            </div>
                            <AssignmentStatusBadge status={assignment.status} />
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
