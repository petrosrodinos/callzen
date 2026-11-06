import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDate } from "@/lib/date";
import { useCancelPlan } from "@/features/billing/hooks/use-billing";
import type { BillingOverview } from "@/features/billing/interfaces/billing.interfaces";
import { CancelReasonOptions } from "@/config/constants/dropdowns/billing/plan.options";

// Cancelling runs the plan to the end of the paid period; then the organisation turns read-only. Data and
// bought minutes are kept for when the plan is resumed (§11a).
export function CancelPlanDialog({ overview, open, onOpenChange }: { overview: BillingOverview; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { t } = useTranslation("billing");
    const cancel = useCancelPlan();
    const [reason, setReason] = useState<string>("");
    const [comment, setComment] = useState("");
    const endsAt = overview.current_period_end;

    return (
        <Dialog open={open} onOpenChange={(next) => !cancel.isPending && onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("cancel.title")}</DialogTitle>
                    <DialogDescription>{endsAt ? t("cancel.descriptionWithDate", { date: formatDate(endsAt) }) : t("cancel.description")}</DialogDescription>
                </DialogHeader>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>{t("cancel.keepsData")}</li>
                    <li>{t("cancel.keepsMinutes")}</li>
                    <li>{t("cancel.readOnly")}</li>
                </ul>
                <div className="space-y-2">
                    <Label>{t("cancel.reasonLabel")}</Label>
                    <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2 sm:grid-cols-2">
                        {CancelReasonOptions.map((option) => (
                            <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
                                <RadioGroupItem value={option.id} /> {option.label}
                            </label>
                        ))}
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cancel-comment">{t("cancel.commentLabel")}</Label>
                    <Textarea id="cancel-comment" value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} rows={3} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancel.isPending}>
                        {t("cancel.keepPlan")}
                    </Button>
                    <Button
                        variant="destructive"
                        loading={cancel.isPending}
                        disabled={cancel.isPending}
                        onClick={() =>
                            cancel.mutate({ reason: reason || undefined, comment: comment.trim() || undefined }, { onSuccess: () => onOpenChange(false) })
                        }
                    >
                        {t("cancel.confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
