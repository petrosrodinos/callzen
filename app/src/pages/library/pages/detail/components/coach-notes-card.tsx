import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { formatClock, formatRelative } from "@/lib/date";
import {
    useCallComments,
    useCreateCallComment,
    useDeleteCallComment,
    useUpdateCallComment,
} from "@/features/coaching/hooks/use-coaching";
import type { CallComment } from "@/features/coaching/interfaces/coaching.interfaces";
import { commentSchema, type CommentFormValues } from "@/features/coaching/validation-schemas/assignment.schema";

interface CommentFormProps {
    initial?: string;
    // Shows the "pin to the current moment" option when set.
    currentMs?: number;
    submitLabel: string;
    isPending: boolean;
    onSubmit: (body: string, atMs?: number) => void;
    onCancel?: () => void;
}

function CommentForm({ initial = "", currentMs, submitLabel, isPending, onSubmit, onCancel }: CommentFormProps) {
    const { t } = useTranslation("coaching");
    const [pin, setPin] = useState(false);
    const form = useForm<CommentFormValues>({ resolver: zodResolver(commentSchema), defaultValues: { body: initial } });
    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values.body.trim(), pin && currentMs != null ? Math.round(currentMs) : undefined);
                    form.reset({ body: "" });
                    setPin(false);
                })}
                className="space-y-2"
            >
                <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea rows={3} maxLength={2000} placeholder={t("comments.placeholder")} aria-label={t("comments.placeholder")} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {currentMs != null ? (
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox checked={pin} onCheckedChange={(value) => setPin(!!value)} />
                            {t("comments.pinAt", { time: formatClock(currentMs) })}
                        </label>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
                                {t("actions.cancel")}
                            </Button>
                        )}
                        <Button type="submit" size="sm" loading={isPending} disabled={isPending}>
                            {submitLabel}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}

interface CommentItemProps {
    callId: string;
    comment: CallComment;
    highlighted: boolean;
    currentMs: number;
    onSeek: (ms: number) => void;
    onDelete: (comment: CallComment) => void;
}

function CommentItem({ callId, comment, highlighted, currentMs, onSeek, onDelete }: CommentItemProps) {
    const { t } = useTranslation("coaching");
    const [editing, setEditing] = useState(false);
    const [replying, setReplying] = useState(false);
    const update = useUpdateCallComment();
    const create = useCreateCallComment();

    return (
        <li id={`comment-${comment.id}`} className={cn("rounded-lg p-2 transition-colors", highlighted && "bg-primary/5 ring-1 ring-primary/30")}>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{comment.author?.name ?? t("comments.deletedUser")}</span>
                <span>{formatRelative(comment.created_at)}</span>
                {comment.edited_at && !comment.deleted && <span>· {t("comments.edited")}</span>}
                {comment.at_ms != null && (
                    <button type="button" onClick={() => onSeek(comment.at_ms as number)} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Clock className="size-3" /> {formatClock(comment.at_ms)}
                    </button>
                )}
            </div>
            {editing ? (
                <div className="mt-1">
                    <CommentForm
                        initial={comment.body ?? ""}
                        submitLabel={t("actions.save")}
                        isPending={update.isPending}
                        onSubmit={(body) => update.mutate({ callId, commentId: comment.id, body }, { onSuccess: () => setEditing(false) })}
                        onCancel={() => setEditing(false)}
                    />
                </div>
            ) : (
                <p className={cn("mt-0.5 whitespace-pre-line text-sm", comment.deleted && "italic text-muted-foreground")}>
                    {comment.deleted ? t("comments.deleted") : comment.body}
                </p>
            )}
            {!comment.deleted && !editing && (comment.can_reply || comment.can_edit || comment.can_delete) && (
                <div className="mt-1 flex gap-1">
                    {comment.can_reply && !comment.parent_id && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setReplying((value) => !value)}>
                            <Reply className="size-3.5" /> {t("comments.reply")}
                        </Button>
                    )}
                    {comment.can_edit && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                            <Pencil className="size-3.5" /> {t("actions.edit")}
                        </Button>
                    )}
                    {comment.can_delete && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => onDelete(comment)}>
                            <Trash2 className="size-3.5" /> {t("actions.delete")}
                        </Button>
                    )}
                </div>
            )}
            {comment.replies.length > 0 && (
                <ul className="ml-4 mt-2 space-y-1 border-l pl-3">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            callId={callId}
                            comment={reply}
                            highlighted={false}
                            currentMs={currentMs}
                            onSeek={onSeek}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
            {replying && (
                <div className="ml-4 mt-2 border-l pl-3">
                    <CommentForm
                        currentMs={currentMs}
                        submitLabel={t("comments.reply")}
                        isPending={create.isPending}
                        onSubmit={(body, atMs) =>
                            create.mutate({ callId, dto: { body, parent_id: comment.id, at_ms: atMs } }, { onSuccess: () => setReplying(false) })
                        }
                        onCancel={() => setReplying(false)}
                    />
                </div>
            )}
        </li>
    );
}

// Coach notes (§10.1d): threads on a call, optionally pinned to a moment of the recording. Comments are
// independent of the analysis, so they show whatever the plan's analysis visibility is.
export function CoachNotesCard({ callId, currentMs, onSeek }: { callId: string; currentMs: number; onSeek: (ms: number) => void }) {
    const { t } = useTranslation("coaching");
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get("comment");
    const { data, isPending } = useCallComments(callId);
    const create = useCreateCallComment();
    const remove = useDeleteCallComment();
    const [toDelete, setToDelete] = useState<CallComment | null>(null);

    useEffect(() => {
        if (!highlightId || !data) return;
        document.getElementById(`comment-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [highlightId, data]);

    if (isPending) return <Skeleton className="h-32 w-full rounded-xl" />;
    if (!data || (!data.data.length && !data.can_comment)) return null;

    const isHighlighted = (comment: CallComment) =>
        comment.id === highlightId || comment.replies.some((reply) => reply.id === highlightId);

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <MessageSquare className="size-4" /> {t("comments.title")}
            </h2>
            {!data.data.length ? (
                <p className="mb-3 text-sm text-muted-foreground">{t("comments.empty")}</p>
            ) : (
                <ul className="mb-3 space-y-2">
                    {data.data.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            callId={callId}
                            comment={comment}
                            highlighted={isHighlighted(comment)}
                            currentMs={currentMs}
                            onSeek={onSeek}
                            onDelete={setToDelete}
                        />
                    ))}
                </ul>
            )}
            {data.can_comment && (
                <CommentForm
                    currentMs={currentMs}
                    submitLabel={t("comments.add")}
                    isPending={create.isPending}
                    onSubmit={(body, atMs) => create.mutate({ callId, dto: { body, at_ms: atMs } })}
                />
            )}
            <ConfirmationDialog
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && remove.mutate({ callId, commentId: toDelete.id }, { onSuccess: () => setToDelete(null) })}
                title={t("comments.deleteTitle")}
                description={t("comments.deleteDescription")}
                confirmText={t("actions.delete")}
                variant="destructive"
                isLoading={remove.isPending}
            />
        </Card>
    );
}
