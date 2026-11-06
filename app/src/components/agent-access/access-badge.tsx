import { useTranslation } from "react-i18next";
import { Globe, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgentVisibilities, type AgentVisibility } from "@/features/agent-access/interfaces/agent-access.interfaces";

interface AccessBadgeProps {
    visibility: AgentVisibility;
    // Present for managers only.
    accessUserIds?: string[];
    // The viewer authored the item.
    isAuthor: boolean;
    // Show "Everyone" for organisation-wide items (managers on plans with access control).
    showEveryone: boolean;
}

// "Shared with 5", "Private" or "Everyone" on co-pilot and prospect cards (§10.1h UI).
export function AccessBadge({ visibility, accessUserIds, isAuthor, showEveryone }: AccessBadgeProps) {
    const { t } = useTranslation("access");
    if (visibility === AgentVisibilities.ORGANISATION) {
        if (!showEveryone) return null;
        return (
            <Badge variant="outline" className="gap-1">
                <Globe className="size-3" /> {t("badge.everyone")}
            </Badge>
        );
    }
    if (accessUserIds?.length)
        return (
            <Badge variant="outline" className="gap-1">
                <Users className="size-3" /> {t("badge.sharedWith", { count: accessUserIds.length })}
            </Badge>
        );
    if (accessUserIds || isAuthor)
        return (
            <Badge variant="outline" className="gap-1" title={isAuthor ? t("badge.privateHint") : undefined}>
                <Lock className="size-3" /> {t("badge.private")}
            </Badge>
        );
    return (
        <Badge variant="outline" className="gap-1">
            <Users className="size-3" /> {t("badge.sharedWithYou")}
        </Badge>
    );
}
