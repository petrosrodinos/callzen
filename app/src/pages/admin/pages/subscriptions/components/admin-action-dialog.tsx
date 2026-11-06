import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdminActionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel: string;
    destructive?: boolean;
    // Destructive actions ask the admin to type the organisation name (§11b).
    confirmName?: string;
    canConfirm?: boolean;
    isPending: boolean;
    onConfirm: (confirmName: string) => void;
    children?: ReactNode;
}

export function AdminActionDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    destructive,
    confirmName,
    canConfirm = true,
    isPending,
    onConfirm,
    children,
}: AdminActionDialogProps) {
    const { t } = useTranslation("subscriptions");
    const [typed, setTyped] = useState("");
    const nameMatches = !confirmName || typed.trim() === confirmName;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (isPending) return;
                if (!next) setTyped("");
                onOpenChange(next);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children && <div className="space-y-4">{children}</div>}
                {confirmName && (
                    <div className="space-y-2">
                        <Label htmlFor="confirm-name">{t("actions.typeName", { name: confirmName })}</Label>
                        <Input id="confirm-name" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {t("actions.cancel")}
                    </Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        disabled={!canConfirm || !nameMatches || isPending}
                        loading={isPending}
                        onClick={() => onConfirm(typed.trim())}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
