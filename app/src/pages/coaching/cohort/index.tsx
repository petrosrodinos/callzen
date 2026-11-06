import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Download, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanGate } from "@/components/providers/plan-gate";
import { useHasFeature } from "@/hooks/use-plan-features";
import { useCohort, useExportCalls, useExportStudents } from "@/features/coaching/hooks/use-coaching";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { PlanFeatures } from "@/features/billing/interfaces/billing.interfaces";
import { CohortPeriodOptions } from "@/config/constants/dropdowns/coaching/assignment-status.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { PoolCard } from "./components/pool-card";
import { StudentsTable } from "./components/students-table";
import { LeaderboardCard } from "./components/leaderboard-card";

const CohortContent: FC = () => {
    const { t } = useTranslation("coaching");
    const [days, setDays] = useState("30");
    const { data, isPending } = useCohort(Number(days));
    const { can } = usePermissions();
    const { hasFeature: canExportPlan } = useHasFeature(PlanFeatures.STUDENT_EXPORT);
    const exportStudents = useExportStudents();
    const exportCalls = useExportCalls();
    const canExport = can(Permissions.COACHING_EXPORT) && canExportPlan;
    const inactive = data?.students.filter((student) => student.inactive) ?? [];

    return (
        <>
            <PageHeader
                title={t("cohort.title")}
                description={t("cohort.description")}
                actions={
                    <>
                        <Select value={days} onValueChange={setDays}>
                            <SelectTrigger className="h-9 w-[150px]" aria-label={t("cohort.period")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CohortPeriodOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {canExport && (
                            <>
                                <Button variant="outline" onClick={() => exportStudents.mutate()} disabled={exportStudents.isPending}>
                                    <Download /> {t("export.students")}
                                </Button>
                                <Button variant="outline" onClick={() => exportCalls.mutate({})} disabled={exportCalls.isPending}>
                                    <Download /> {t("export.calls")}
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            {isPending || !data ? (
                <DashboardSkeleton />
            ) : !data.students.length ? (
                <EmptyState
                    icon={Users}
                    title={t("cohort.noStudents")}
                    description={t("cohort.noStudentsHint")}
                    action={
                        <Button asChild>
                            <Link to={Routes.organisation.tab("members")}>{t("cohort.invite")}</Link>
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-4">
                    <PoolCard pool={data.pool} />
                    {inactive.length > 0 && (
                        <Card className="gap-0 border-amber-500/30 bg-amber-500/5 p-5">
                            <h2 className="mb-2 flex items-center gap-2 font-semibold">
                                <UserX className="size-4 text-amber-600" /> {t("cohort.inactiveTitle", { count: inactive.length, days: data.inactive_days })}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {inactive.map((student) => (
                                    <Button key={student.user_id} asChild variant="outline" size="sm">
                                        <Link to={Routes.coaching.student(student.user_id)}>{student.name}</Link>
                                    </Button>
                                ))}
                            </div>
                        </Card>
                    )}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <LeaderboardCard title={t("cohort.leaderboard.byScore")} entries={data.leaderboard.by_average_score} unit="score" />
                        <LeaderboardCard title={t("cohort.leaderboard.byPractice")} entries={data.leaderboard.by_practice_minutes} unit="minutes" />
                    </div>
                    <StudentsTable students={data.students} momentsLocked={data.moments_locked} />
                </div>
            )}
        </>
    );
};

const CohortPage: FC = () => {
    const { t } = useTranslation("coaching");
    usePageMetadata({ title: t("cohort.title") });
    return (
        <PlanGate feature={PlanFeatures.COHORT_DASHBOARD} className="mx-auto mt-10 max-w-lg">
            <CohortContent />
        </PlanGate>
    );
};

export default CohortPage;
