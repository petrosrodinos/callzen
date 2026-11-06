import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AssignmentStatuses, type AssignmentStatus } from "@/features/coaching/interfaces/coaching.interfaces";
import { getAssignmentStatusLabel } from "@/config/constants/dropdowns/coaching/assignment-status.options";

const tone: Record<AssignmentStatus, string> = {
    [AssignmentStatuses.OPEN]: "border-sky-500/40 text-sky-700 dark:text-sky-300",
    [AssignmentStatuses.OVERDUE]: "border-red-500/40 text-red-700 dark:text-red-300",
    [AssignmentStatuses.COMPLETED]: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
    [AssignmentStatuses.ARCHIVED]: "text-muted-foreground",
};

export function AssignmentStatusBadge({ status, className }: { status: AssignmentStatus; className?: string }) {
    return (
        <Badge variant="outline" className={cn("font-normal", tone[status], className)}>
            {getAssignmentStatusLabel(status)}
        </Badge>
    );
}
