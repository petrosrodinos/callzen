import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatClock, formatRelative } from "@/lib/date";
import type { StudentDetail } from "@/features/coaching/interfaces/coaching.interfaces";
import { Routes } from "@/routes/routes";

export function StudentCommentsCard({ comments }: { comments: StudentDetail["recent_comments"] }) {
    const { t } = useTranslation("coaching");
    if (!comments.length) return null;
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <MessageSquare className="size-4" /> {t("student.recentComments")}
            </h2>
            <ul className="space-y-3">
                {comments.map((comment) => (
                    <li key={comment.id} className="text-sm">
                        <p className="whitespace-pre-line">{comment.body}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {comment.author?.name ?? t("comments.deletedUser")} · {formatRelative(comment.created_at)} ·{" "}
                            <Link to={`${Routes.library.detail(comment.call_id)}?comment=${comment.id}`} className="hover:underline">
                                {comment.call_title || t("student.untitledCall")}
                                {comment.at_ms != null && ` @ ${formatClock(comment.at_ms)}`}
                            </Link>
                        </p>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
