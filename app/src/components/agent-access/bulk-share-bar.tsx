import { useTranslation } from "react-i18next";
import { CheckSquare, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkShareBarProps {
    selecting: boolean;
    selectedCount: number;
    onStart: () => void;
    onCancel: () => void;
    onShare: () => void;
}

// Toolbar for the bulk "Share with…" action on co-pilot and prospect lists.
export function BulkShareBar({ selecting, selectedCount, onStart, onCancel, onShare }: BulkShareBarProps) {
    const { t } = useTranslation("access");
    if (!selecting)
        return (
            <Button variant="outline" onClick={onStart}>
                <CheckSquare /> {t("bulk.select")}
            </Button>
        );
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("bulk.selected", { count: selectedCount })}</span>
            <Button disabled={!selectedCount} onClick={onShare}>
                <Share2 /> {t("bulk.share")}
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label={t("bulk.cancel")}>
                <X />
            </Button>
        </div>
    );
}
