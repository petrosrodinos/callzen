import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePracticeAgents } from "@/features/practice-agents/hooks/use-practice-agents";
import { useActiveOrganisation, useMembers } from "@/features/organisations/hooks/use-organisations";
import { useCreateAssignment, useUpdateAssignment } from "@/features/coaching/hooks/use-coaching";
import type { AssignmentDetail } from "@/features/coaching/interfaces/coaching.interfaces";
import { assignmentSchema, type AssignmentFormValues } from "@/features/coaching/validation-schemas/assignment.schema";

interface AssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // Editing an existing assignment (the prospect cannot change).
    assignment?: AssignmentDetail;
    // Prefill one student (the "Assign practice" action on a student page).
    defaultUserId?: string;
}

const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

export function AssignmentDialog({ open, onOpenChange, assignment, defaultUserId }: AssignmentDialogProps) {
    const { t } = useTranslation("coaching");
    const { organisation } = useActiveOrganisation();
    const { data: prospects } = usePracticeAgents({ status: "active" });
    const { data: members } = useMembers(organisation?.id, open);
    const create = useCreateAssignment();
    const update = useUpdateAssignment();
    const isPending = create.isPending || update.isPending;
    const students = useMemo(() => (members ?? []).filter((member) => !member.is_you), [members]);

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            practice_agent_id: assignment?.practice_agent_id ?? "",
            title: assignment?.title ?? "",
            instructions: assignment?.instructions ?? "",
            due_date: toDateInput(assignment?.due_at),
            target_score: assignment?.target_score != null ? String(assignment.target_score) : "",
            required_attempts: String(assignment?.required_attempts ?? 1),
            all_members: assignment?.all_members ?? false,
            user_ids: assignment ? assignment.targets.map((target) => target.user_id) : defaultUserId ? [defaultUserId] : [],
        },
    });
    const allMembers = useWatch({ control: form.control, name: "all_members" });

    const onSubmit = (values: AssignmentFormValues) => {
        const dto = {
            title: values.title.trim(),
            instructions: values.instructions?.trim() || undefined,
            due_at: values.due_date ? new Date(`${values.due_date}T23:59:59`).toISOString() : undefined,
            target_score: values.target_score ? Number(values.target_score) : undefined,
            required_attempts: Number(values.required_attempts),
            all_members: values.all_members,
            user_ids: values.all_members ? undefined : values.user_ids,
        };
        const done = { onSuccess: () => onOpenChange(false) };
        if (assignment) update.mutate({ id: assignment.id, dto }, done);
        else create.mutate({ ...dto, practice_agent_id: values.practice_agent_id }, done);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="size-5" /> {assignment ? t("assignments.dialog.editTitle") : t("assignments.dialog.createTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("assignments.dialog.description")}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="practice_agent_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("assignments.dialog.prospect")}</FormLabel>
                                    <Select
                                        value={field.value || undefined}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (!form.getValues("title")) {
                                                const prospect = prospects?.find((item) => item.id === value);
                                                if (prospect) form.setValue("title", t("assignments.dialog.defaultTitle", { name: prospect.name }));
                                            }
                                        }}
                                        disabled={!!assignment}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-label={t("assignments.dialog.prospect")}>
                                                <SelectValue placeholder={assignment ? assignment.practice_agent_name : t("assignments.dialog.chooseProspect")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(prospects ?? []).map((prospect) => (
                                                <SelectItem key={prospect.id} value={prospect.id}>
                                                    {prospect.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {assignment && <FormDescription>{t("assignments.dialog.prospectLocked")}</FormDescription>}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("assignments.dialog.title")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="instructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("assignments.dialog.instructions")}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder={t("assignments.dialog.instructionsPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="due_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("assignments.dialog.dueDate")}</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="target_score"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("assignments.dialog.targetScore")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={0} max={100} placeholder={t("assignments.dialog.optional")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="required_attempts"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("assignments.dialog.attempts")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={50} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="all_members"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <div>
                                        <FormLabel>{t("assignments.dialog.everyone")}</FormLabel>
                                        <FormDescription>{t("assignments.dialog.everyoneHint")}</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        {!allMembers && (
                            <FormField
                                control={form.control}
                                name="user_ids"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("assignments.dialog.students")}</FormLabel>
                                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                                            {!students.length ? (
                                                <p className="p-2 text-sm text-muted-foreground">{t("assignments.dialog.noStudents")}</p>
                                            ) : (
                                                students.map((member) => {
                                                    const checked = field.value.includes(member.user_id);
                                                    return (
                                                        <label
                                                            key={member.user_id}
                                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                                                        >
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={(value) =>
                                                                    field.onChange(
                                                                        value
                                                                            ? [...field.value, member.user_id]
                                                                            : field.value.filter((id) => id !== member.user_id),
                                                                    )
                                                                }
                                                            />
                                                            <span className="flex-1 truncate">{member.full_name || member.email}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                {t("actions.cancel")}
                            </Button>
                            <Button type="submit" loading={isPending} disabled={isPending}>
                                {assignment ? t("actions.save") : t("assignments.dialog.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
