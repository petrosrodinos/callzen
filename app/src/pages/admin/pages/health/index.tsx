import type { FC } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useGetHealth } from "@/features/health/hooks/use-health";
import {
    HealthCheckStatus,
    HealthServiceName,
    type HealthCheckStatusType,
    type HealthResponse,
} from "@/features/health/interfaces/health.interfaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const checkStatusVariant: Record<HealthCheckStatusType, "success" | "secondary" | "destructive"> = {
    [HealthCheckStatus.OK]: "success",
    [HealthCheckStatus.NOT_CONFIGURED]: "secondary",
    [HealthCheckStatus.DOWN]: "destructive",
};

const formatDuration = (value?: number) => {
    if (value === undefined) {
        return "—";
    }

    return `${value} ms`;
};

const formatUptime = (value?: number) => {
    if (value === undefined) {
        return "—";
    }

    const totalSeconds = Math.floor(value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
};

const HealthStatusCard = ({
    title,
    description,
    data,
    isLoading,
    isError,
    errorMessage,
}: {
    title: string;
    description: string;
    data?: HealthResponse;
    isLoading: boolean;
    isError: boolean;
    errorMessage?: string;
}) => {
    const { t } = useTranslation("admin");

    if (isLoading) {
        return <Skeleton className="h-44 rounded-xl" />;
    }

    if (isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{errorMessage ?? t("health.loadError")}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Badge variant={checkStatusVariant[data.status]}>{t(`health.status.${data.status}`)}</Badge>
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("health.lastChecked")}</span>
                    <span className="font-medium">{new Date(data.timestamp).toLocaleString()}</span>
                </div>
                {data.service === HealthServiceName.API ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("health.uptime")}</span>
                            <span className="font-medium">{formatUptime(data.uptime_ms)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("health.uptimeMs")}</span>
                            <span className="font-medium">{data.uptime_ms.toLocaleString()} ms</span>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("health.responseTime")}</span>
                        <span className="font-medium">{formatDuration(data.ms)}</span>
                    </div>
                )}
                {"message" in data && data.message ? (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground">{data.message}</div>
                ) : null}
            </CardContent>
        </Card>
    );
};

const HealthPage: FC = () => {
    const { t } = useTranslation("admin");
    const queryClient = useQueryClient();
    const apiHealth = useGetHealth(HealthServiceName.API);
    const postgresHealth = useGetHealth(HealthServiceName.POSTGRES);
    const redisHealth = useGetHealth(HealthServiceName.REDIS);

    const isFetching = apiHealth.isFetching || postgresHealth.isFetching || redisHealth.isFetching;

    const refreshAll = () => {
        void queryClient.invalidateQueries({ queryKey: ["health"] });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("health.title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("health.subtitle")}</p>
                </div>
                <Button variant="outline" onClick={refreshAll} disabled={isFetching}>
                    <IconRefresh className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                    {t("health.refresh")}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <HealthStatusCard
                    title="API"
                    description={t("health.cards.api")}
                    data={apiHealth.data}
                    isLoading={apiHealth.isLoading}
                    isError={apiHealth.isError}
                    errorMessage={apiHealth.error instanceof Error ? apiHealth.error.message : undefined}
                />
                <HealthStatusCard
                    title="Postgres"
                    description={t("health.cards.postgres")}
                    data={postgresHealth.data}
                    isLoading={postgresHealth.isLoading}
                    isError={postgresHealth.isError}
                    errorMessage={postgresHealth.error instanceof Error ? postgresHealth.error.message : undefined}
                />
                <HealthStatusCard
                    title="Redis"
                    description={t("health.cards.redis")}
                    data={redisHealth.data}
                    isLoading={redisHealth.isLoading}
                    isError={redisHealth.isError}
                    errorMessage={redisHealth.error instanceof Error ? redisHealth.error.message : undefined}
                />
            </div>
        </div>
    );
};

export default HealthPage;
