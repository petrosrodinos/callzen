import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { getNotificationContent } from "@/lib/notification-content";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from "@/features/notifications/hooks/use-notifications";
import type { AppNotification } from "@/features/notifications/interfaces/notifications.interfaces";

const PAGE_SIZE = 20;

const NotificationsPage: FC = () => {
    const { t } = useTranslation("notifications");
    usePageMetadata({ title: t("title") });
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const { data, isPending } = useNotifications({ page, limit: PAGE_SIZE, unread: unreadOnly });
    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();

    const open = (notification: AppNotification) => {
        if (!notification.read_at) markRead.mutate(notification.id);
        const { href } = getNotificationContent(notification);
        if (href) navigate(href);
    };

    return (
        <div className="mx-auto max-w-3xl">
            <PageHeader
                title={t("title")}
                description={t("description")}
                actions={
                    <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending} loading={markAll.isPending}>
                        {!markAll.isPending && <CheckCheck />} {t("markAllRead")}
                    </Button>
                }
            />
            <Tabs
                value={unreadOnly ? "unread" : "all"}
                onValueChange={(value) => {
                    setUnreadOnly(value === "unread");
                    setPage(1);
                }}
                className="mb-4"
            >
                <TabsList>
                    <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
                    <TabsTrigger value="unread">{t("filters.unread")}</TabsTrigger>
                </TabsList>
            </Tabs>

            {isPending ? (
                <ListSkeleton rows={8} />
            ) : !data?.data.length ? (
                <EmptyState icon={Bell} title={t("empty")} description={t("emptyHint")} />
            ) : (
                <>
                    <Card className="divide-y gap-0 p-0">
                        {data.data.map((notification) => {
                            const content = getNotificationContent(notification);
                            return (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => open(notification)}
                                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                                >
                                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", notification.read_at ? "bg-transparent" : "bg-primary")} />
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block text-sm", !notification.read_at && "font-medium")}>{content.text}</span>
                                        <span className="block text-xs text-muted-foreground">{formatDateTime(notification.created_at)}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </Card>
                    {data.pagination.total_pages > 1 && (
                        <Pagination className="mt-4" currentPage={page} totalPages={data.pagination.total_pages} onPageChange={setPage} />
                    )}
                </>
            )}
        </div>
    );
};

export default NotificationsPage;
