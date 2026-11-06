import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardPlus, Download, FileQuestion, Headphones, PhoneCall, Target, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanGate } from "@/components/providers/plan-gate";
import { useHasFeature } from "@/hooks/use-plan-features";
import { AssignmentDialog } from "@/components/coaching/assignment-dialog";
import { useExportCalls, useStudent } from "@/features/coaching/hooks/use-coaching";
import { PlanFeatures } from "@/features/billing/interfaces/billing.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { DashboardPeriodOptions } from "@/config/constants/dropdowns/calls/call-filters.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatMinutes } from "@/lib/format";
import { formatDate, formatRelative } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { ScoreTrendCard } from "@/pages/dashboard/components/score-trend-card";
import { SkillsCard } from "@/pages/dashboard/components/skills-card";
import { RecurringMistakesCard } from "@/pages/dashboard/components/recurring-mistakes-card";
import { StudentAccessSection } from "./components/student-access-section";
import { StudentCallsCard } from "./components/student-calls-card";
import { StudentAssignmentsCard } from "./components/student-assignments-card";
import { StudentCommentsCard } from "./components/student-comments-card";

const minutesOfCap = (used: number, cap: number | null) => (cap == null ? formatMinutes(used) : `${formatMinutes(used)} / ${formatMinutes(cap)}`);

const StudentContent: FC<{ userId: string }> = ({ userId }) => {
    const { t } = useTranslation("coaching");
    const [days, setDays] = useState("90");
    const { data, isPending, isError } = useStudent(userId, Number(days));
    const { can } = usePermissions();
    const { hasFeature: hasAssignments } = useHasFeature(PlanFeatures.PRACTICE_ASSIGNMENTS);
    const { hasFeature: hasExport } = useHasFeature(PlanFeatures.STUDENT_EXPORT);
    const exportCalls = useExportCalls();
    const [assignOpen, setAssignOpen] = useState(false);
    usePageMetadata({ title: data?.member.name ?? t("student.title") });

    if (isPending) return <DashboardSkeleton />;
    if (isError || !data)
        return (
            <EmptyState
                icon={FileQuestion}
                title={t("student.notFound")}
                action={
                    <Button asChild>
                        <Link to={Routes.coaching.cohort}>{t("student.back")}</Link>
                    </Button>
                }
            />
        );

    const { member, kpis, overview } = data;
    const locked = overview.locked_cards ?? [];

    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link to={Routes.coaching.cohort}>
                    <ArrowLeft /> {t("student.back")}
                </Link>
            </Button>
            <PageHeader
                title={
                    <span className="flex flex-wrap items-center gap-2">
                        {member.name}
                        <Badge variant="outline">{getOrgRoleLabel(member.role)}</Badge>
                    </span>
                }
                description={t("student.subtitle", {
                    email: member.email,
                    joined: formatDate(member.joined_at),
                    active: member.last_active_at ? formatRelative(member.last_active_at) : t("cohort.students.never"),
                })}
                actions={
                    <>
                        <Select value={days} onValueChange={setDays}>
                            <SelectTrigger className="h-9 w-[150px]" aria-label={t("cohort.period")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DashboardPeriodOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {can(Permissions.COACHING_EXPORT) && hasExport && (
                            <Button variant="outline" onClick={() => exportCalls.mutate({ user_id: member.user_id })} disabled={exportCalls.isPending}>
                                <Download /> {t("export.studentCalls")}
                            </Button>
                        )}
                        {can(Permissions.COACHING_MANAGE) && hasAssignments && (
                            <Button onClick={() => setAssignOpen(true)}>
                                <ClipboardPlus /> {t("student.assignPractice")}
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label={t("student.kpis.averageScore")}
                    value={kpis.average_score ?? "–"}
                    icon={Target}
                    hint={kpis.score_change != null ? t("student.kpis.change", { change: kpis.score_change > 0 ? `+${kpis.score_change}` : kpis.score_change }) : undefined}
                />
                <StatCard label={t("student.kpis.liveSessions")} value={kpis.live_sessions} icon={PhoneCall} />
                <StatCard label={t("student.kpis.practiceSessions")} value={kpis.practice_sessions} icon={Headphones} />
                <StatCard
                    label={t("student.kpis.minutesPeriod")}
                    value={minutesOfCap(kpis.practice_minutes_period, kpis.practice_cap_minutes)}
                    icon={Timer}
                    hint={t("student.kpis.liveMinutes", { minutes: minutesOfCap(kpis.live_minutes_period, kpis.live_cap_minutes) })}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ScoreTrendCard data={overview.score_trend} />
                {locked.includes("categories") ? (
                    <Card className="p-5 text-sm text-muted-foreground">{t("student.lockedAnalysis")}</Card>
                ) : (
                    <SkillsCard categories={overview.categories} />
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {locked.includes("recurring_mistakes") ? (
                    <Card className="p-5 text-sm text-muted-foreground">{t("student.lockedMistakes")}</Card>
                ) : (
                    <RecurringMistakesCard mistakes={overview.recurring_mistakes} />
                )}
                <StudentAssignmentsCard assignments={data.assignments} />
            </div>

            <StudentCallsCard calls={data.recent_calls} />
            <StudentCommentsCard comments={data.recent_comments} />
            <StudentAccessSection userId={member.user_id} />

            {assignOpen && <AssignmentDialog open={assignOpen} onOpenChange={setAssignOpen} defaultUserId={member.user_id} />}
        </div>
    );
};

const StudentPage: FC = () => {
    const { userId } = useParams<{ userId: string }>();
    return (
        <PlanGate feature={PlanFeatures.STUDENT_PAGES} className="mx-auto mt-10 max-w-lg">
            {userId && <StudentContent userId={userId} />}
        </PlanGate>
    );
};

export default StudentPage;
