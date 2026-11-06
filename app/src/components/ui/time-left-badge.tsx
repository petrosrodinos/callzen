import { useTranslation } from "react-i18next";
import { Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatClock } from "@/lib/date";

// Countdown shown during the last minutes of a call that has a time limit.
export function TimeLeftBadge({ remainingMs }: { remainingMs: number }) {
    const { t } = useTranslation("common");
    return (
        <Badge variant="destructive" className="gap-1 tabular-nums" role="timer" aria-live="polite">
            <Hourglass className="size-3" /> {t("timeLeft", { time: formatClock(remainingMs) })}
        </Badge>
    );
}
