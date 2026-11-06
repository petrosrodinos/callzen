import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import { getNotificationContent } from "@/lib/notification-content";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadNotificationsCount,
} from "@/features/notifications/hooks/use-notifications";
import type { AppNotification } from "@/features/notifications/interfaces/notifications.interfaces";
import { Routes } from "@/routes/routes";

const LATEST = 8;

// Header bell: unread count of the active organisation, latest items, and a dot when another organisation
// has unread notifications (§10.1f).
export function NotificationsBell() {
    const { t } = useTranslation("notifications");
    const navigate = useNavigate();
    const { data: unread } = useUnreadNotificationsCount();
    const { data: latest } = useNotifications({ limit: LATEST });
    const markRead = useMarkNotificationRead();
    const markAll = useMarkAllNotificationsRead();
    const count = unread?.count ?? 0;
    const otherUnread = (unread?.other_organisations ?? []).reduce((sum, org) => sum + org.count, 0);

    const open = (notification: AppNotification) => {
        if (!notification.read_at) markRead.mutate(notification.id);
        const { href } = getNotificationContent(notification);
        if (href) navigate(href);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label={t("bell.aria", { count })}>
                    <Bell />
                    {count > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                            {count > 99 ? "99+" : count}
                        </span>
                    )}
                    {!count && otherUnread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                    <span>{t("title")}</span>
                    {count > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
                            <CheckCheck className="size-3.5" /> {t("markAllRead")}
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!latest?.data.length ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    latest.data.map((notification) => (
                        <DropdownMenuItem key={notification.id} onSelect={() => open(notification)} className="flex items-start gap-2 py-2">
                            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", notification.read_at ? "bg-transparent" : "bg-primary")} />
                            <span className="min-w-0 flex-1">
                                <span className={cn("block text-sm", !notification.read_at && "font-medium")}>{getNotificationContent(notification).text}</span>
                                <span className="block text-xs text-muted-foreground">{formatRelative(notification.created_at)}</span>
                            </span>
                        </DropdownMenuItem>
                    ))
                )}
                {otherUnread > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("otherOrganisations", { count: otherUnread })}</p>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link to={Routes.notifications} className="justify-center text-sm font-medium">
                        {t("seeAll")}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
