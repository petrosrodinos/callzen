import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlanGate } from "@/components/providers/plan-gate";
import { AssignmentDialog } from "@/components/coaching/assignment-dialog";
import { AssignmentStatusBadge } from "@/components/coaching/assignment-status-badge";
import { useAssignments } from "@/features/coaching/hooks/use-coaching";
import type { AssignmentStatus } from "@/features/coaching/interfaces/coaching.interfaces";
import { PlanFeatures } from "@/features/billing/interfaces/billing.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { AssignmentStatusFilterOptions } from "@/config/constants/dropdowns/coaching/assignment-status.options";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";

const PAGE_SIZE = 20;

const AssignmentsContent: FC = () => {
    const { t } = useTranslation("coaching");
    const { can } = usePermissions();
    const canManage = can(Permissions.COACHING_MANAGE);
    const [status, setStatus] = useState<AssignmentStatus | "all">("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [createOpen, setCreateOpen] = useState(false);
    const debouncedSearch = useDebouncedValue(search, 300);
    const { data, isPending } = useAssignments({ status, search: debouncedSearch || undefined, page, limit: PAGE_SIZE });

    return (
        <>
            <PageHeader
                title={t("assignments.title")}
                description={t("assignments.description")}
                actions={
                    canManage && (
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus /> {t("assignments.new")}
                        </Button>
                    )
                }
            />
            <div className="mb-4 flex flex-wrap gap-2">
                <Input
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder={t("assignments.search")}
                    aria-label={t("assignments.search")}
                    className="h-9 w-64"
                />
                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value as AssignmentStatus | "all");
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="h-9 w-44" aria-label={t("assignments.filterStatus")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {AssignmentStatusFilterOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isPending ? (
                <ListSkeleton rows={6} />
            ) : !data?.data.length ? (
                <EmptyState
                    icon={ClipboardList}
                    title={t("assignments.empty")}
                    description={t("assignments.emptyHint")}
                    action={
                        canManage && (
                            <Button onClick={() => setCreateOpen(true)}>
                                <Plus /> {t("assignments.new")}
                            </Button>
                        )
                    }
                />
            ) : (
                <>
                    <Card className="gap-0 p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("assignments.columns.assignment")}</TableHead>
                                        <TableHead>{t("assignments.columns.status")}</TableHead>
                                        <TableHead>{t("assignments.columns.due")}</TableHead>
                                        <TableHead className="min-w-40">{t("assignments.columns.progress")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.data.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell>
                                                <Link to={Routes.coaching.assignment(assignment.id)} className="font-medium hover:underline">
                                                    {assignment.title}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {assignment.prospect_removed ? t("assignments.prospectRemoved") : assignment.practice_agent_name}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <AssignmentStatusBadge status={assignment.status} />
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                {assignment.due_at ? formatDate(assignment.due_at) : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={assignment.progress.total ? (assignment.progress.completed / assignment.progress.total) * 100 : 0}
                                                        className="h-1.5"
                                                        aria-label={t("assignments.columns.progress")}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {t("assignments.progress", { completed: assignment.progress.completed, total: assignment.progress.total })}
                                                        {assignment.progress.overdue > 0 && ` · ${t("assignments.overdueCount", { count: assignment.progress.overdue })}`}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                    {data.pagination.total_pages > 1 && (
                        <Pagination className="mt-4" currentPage={page} totalPages={data.pagination.total_pages} onPageChange={setPage} />
                    )}
                </>
            )}
            {createOpen && <AssignmentDialog open={createOpen} onOpenChange={setCreateOpen} />}
        </>
    );
};

const AssignmentsPage: FC = () => {
    const { t } = useTranslation("coaching");
    usePageMetadata({ title: t("assignments.title") });
    return (
        <PlanGate feature={PlanFeatures.PRACTICE_ASSIGNMENTS} className="mx-auto mt-10 max-w-lg">
            <AssignmentsContent />
        </PlanGate>
    );
};

export default AssignmentsPage;
