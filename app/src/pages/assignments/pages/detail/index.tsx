import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, FileQuestion, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { ScoreBadge } from "@/components/ui/score-badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignmentDialog } from "@/components/coaching/assignment-dialog";
import { AssignmentStatusBadge } from "@/components/coaching/assignment-status-badge";
import { useAssignment, useDeleteAssignment, useUpdateAssignment } from "@/features/coaching/hooks/use-coaching";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate, formatDateTime, formatDuration } from "@/lib/date";
import { Routes } from "@/routes/routes";

const AssignmentDetailPage: FC = () => {
    const { t } = useTranslation("coaching");
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: assignment, isPending, isError } = useAssignment(id);
    const { can } = usePermissions();
    const canManage = can(Permissions.COACHING_MANAGE);
    const update = useUpdateAssignment();
    const remove = useDeleteAssignment();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    usePageMetadata({ title: assignment?.title ?? t("assignments.title") });

    if (isPending) return <DetailSkeleton />;
    if (isError || !assignment)
        return (
            <EmptyState
                icon={FileQuestion}
                title={t("assignments.notFound")}
                action={
                    <Button asChild>
                        <Link to={Routes.coaching.assignments}>{t("assignments.back")}</Link>
                    </Button>
                }
            />
        );

    const archived = !!assignment.archived_at;

    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={Routes.coaching.assignments}>
                    <ArrowLeft /> {t("assignments.back")}
                </Link>
            </Button>
            <PageHeader
                title={assignment.title}
                description={assignment.prospect_removed ? t("assignments.prospectRemoved") : t("assignments.withProspect", { name: assignment.practice_agent_name })}
                actions={
                    canManage && (
                        <>
                            {!archived && (
                                <Button variant="outline" onClick={() => setEditOpen(true)}>
                                    <Pencil /> {t("actions.edit")}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => update.mutate({ id: assignment.id, dto: { archived: !archived } })}
                                disabled={update.isPending}
                            >
                                {archived ? <ArchiveRestore /> : <Archive />} {archived ? t("actions.restore") : t("actions.archive")}
                            </Button>
                            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                                <Trash2 /> {t("actions.delete")}
                            </Button>
                        </>
                    )
                }
            />

            <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <div>
                    <p className="text-xs text-muted-foreground">{t("assignments.columns.status")}</p>
                    <AssignmentStatusBadge status={assignment.status} className="mt-1" />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{t("assignments.columns.due")}</p>
                    <p className="font-medium">{assignment.due_at ? formatDate(assignment.due_at) : t("assignments.noDueDate")}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{t("assignments.dialog.targetScore")}</p>
                    <p className="font-medium">{assignment.target_score ?? "—"}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{t("assignments.dialog.attempts")}</p>
                    <p className="font-medium">{assignment.required_attempts}</p>
                </div>
                {assignment.instructions && <p className="col-span-full whitespace-pre-line text-sm text-muted-foreground">{assignment.instructions}</p>}
            </Card>

            <Card className="gap-0 p-5">
                <h2 className="mb-3 font-semibold">
                    {t("assignments.studentsProgress", { completed: assignment.progress.completed, total: assignment.progress.total })}
                </h2>
                {!assignment.targets.length ? (
                    <p className="text-sm text-muted-foreground">{t("assignments.noTargets")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("assignments.columns.student")}</TableHead>
                                    <TableHead>{t("assignments.columns.status")}</TableHead>
                                    <TableHead>{t("assignments.columns.attempts")}</TableHead>
                                    <TableHead>{t("assignments.columns.bestScore")}</TableHead>
                                    <TableHead>{t("assignments.columns.sessions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignment.targets.map((target) => (
                                    <TableRow key={target.user_id}>
                                        <TableCell>
                                            <Link to={Routes.coaching.student(target.user_id)} className="font-medium hover:underline">
                                                {target.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <AssignmentStatusBadge status={target.status} />
                                        </TableCell>
                                        <TableCell className="tabular-nums">
                                            {target.attempts_count} / {assignment.required_attempts}
                                        </TableCell>
                                        <TableCell>
                                            <ScoreBadge score={target.best_score} />
                                        </TableCell>
                                        <TableCell>
                                            {!target.attempts.length ? (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            ) : (
                                                <ul className="space-y-0.5 text-sm">
                                                    {target.attempts.map((attempt) => (
                                                        <li key={attempt.call_id}>
                                                            <Link to={Routes.library.detail(attempt.call_id)} className="hover:underline">
                                                                {formatDateTime(attempt.started_at)}
                                                            </Link>{" "}
                                                            <span className="text-muted-foreground">
                                                                · {formatDuration(attempt.duration_seconds)}
                                                                {attempt.score != null && ` · ${attempt.score}`}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {editOpen && <AssignmentDialog open={editOpen} onOpenChange={setEditOpen} assignment={assignment} />}
            <ConfirmationDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => remove.mutate(assignment.id, { onSuccess: () => navigate(Routes.coaching.assignments) })}
                title={t("assignments.deleteTitle")}
                description={t("assignments.deleteDescription")}
                confirmText={t("actions.delete")}
                variant="destructive"
                isLoading={remove.isPending}
            />
        </div>
    );
};

export default AssignmentDetailPage;
