import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useShareAgents } from "@/features/agent-access/hooks/use-agent-access";
import { MemberPicker } from "./member-picker";

interface ShareAgentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assistantAgentIds?: string[];
    practiceAgentIds?: string[];
    onShared?: () => void;
}

// Bulk "Share with…" for a selection of co-pilots or prospects (§10.1h UI). Items already shared with everyone
// are skipped by the API.
export function ShareAgentsDialog({ open, onOpenChange, assistantAgentIds = [], practiceAgentIds = [], onShared }: ShareAgentsDialogProps) {
    const { t } = useTranslation("access");
    const share = useShareAgents();
    const [userIds, setUserIds] = useState<string[]>([]);
    const count = assistantAgentIds.length + practiceAgentIds.length;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (share.isPending) return;
                if (!next) setUserIds([]);
                onOpenChange(next);
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("share.title", { count })}</DialogTitle>
                    <DialogDescription>{t("share.description")}</DialogDescription>
                </DialogHeader>
                <MemberPicker value={userIds} onChange={setUserIds} />
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={share.isPending}>
                        {t("share.cancel")}
                    </Button>
                    <Button
                        disabled={!userIds.length || !count || share.isPending}
                        loading={share.isPending}
                        onClick={() =>
                            share.mutate(
                                {
                                    ...(assistantAgentIds.length && { assistant_agent_ids: assistantAgentIds }),
                                    ...(practiceAgentIds.length && { practice_agent_ids: practiceAgentIds }),
                                    user_ids: userIds,
                                },
                                {
                                    onSuccess: () => {
                                        setUserIds([]);
                                        onOpenChange(false);
                                        onShared?.();
                                    },
                                },
                            )
                        }
                    >
                        {!share.isPending && <Share2 />} {t("share.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
