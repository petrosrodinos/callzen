import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { useReport, useReports } from "@/features/coaching/hooks/use-coaching";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { ReportView } from "./components/report-view";

// Weekly coach reports, newest first; the latest opens by default (§10.1e). Readable after a downgrade too.
const ReportsPage: FC = () => {
    const { t } = useTranslation("coaching");
    usePageMetadata({ title: t("reports.title") });
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const { data: list, isPending } = useReports(page);
    const selectedId = searchParams.get("report") ?? list?.data[0]?.id;
    const { data: report, isPending: reportPending } = useReport(selectedId);

    return (
        <>
            <PageHeader title={t("reports.title")} description={t("reports.description")} />
            {isPending ? (
                <ListSkeleton rows={5} />
            ) : !list?.data.length ? (
                <EmptyState icon={FileBarChart} title={t("reports.empty")} description={t("reports.emptyHint")} />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
                    <div className="space-y-2">
                        <Card className="gap-0 divide-y p-0">
                            {list.data.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSearchParams({ report: item.id })}
                                    className={cn(
                                        "w-full px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                                        item.id === selectedId && "bg-primary/5 font-medium",
                                    )}
                                >
                                    <span className="block">{t("reports.weekShort", { date: formatDate(item.period_start) })}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {item.empty ? t("reports.emptyShort") : t("reports.sessionsShort", { count: item.totals.sessions })}
                                    </span>
                                </button>
                            ))}
                        </Card>
                        {list.pagination.total_pages > 1 && (
                            <Pagination currentPage={page} totalPages={list.pagination.total_pages} onPageChange={setPage} />
                        )}
                    </div>
                    {reportPending || !report ? <Skeleton className="h-96 w-full rounded-xl" /> : <ReportView report={report} />}
                </div>
            )}
        </>
    );
};

export default ReportsPage;
