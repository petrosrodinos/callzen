import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, ShoppingCart, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlanPromptStore } from "@/stores/plan-prompt";
import { PlanErrorCodes, PlanLimitKeys, type PlanErrorDetails } from "@/features/billing/interfaces/billing.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { getPlanFeatureLabel, getPlanLimitLabel } from "@/config/constants/dropdowns/billing/plan-feature.options";
import { Routes } from "@/routes/routes";

const MINUTE_LIMITS: string[] = [
    PlanLimitKeys.LIVE_MINUTES,
    PlanLimitKeys.PRACTICE_MINUTES,
    PlanLimitKeys.LIVE_MINUTES_PER_MEMBER,
    PlanLimitKeys.PRACTICE_MINUTES_PER_MEMBER,
];
const MEMBER_CAPS: string[] = [PlanLimitKeys.LIVE_MINUTES_PER_MEMBER, PlanLimitKeys.PRACTICE_MINUTES_PER_MEMBER];

function useCopy(error: PlanErrorDetails) {
    const { t } = useTranslation("billing");
    const plan = error.next_plan ? getPlanLabel(error.next_plan) : null;
    if (error.code === PlanErrorCodes.SUBSCRIPTION_REQUIRED)
        return { title: t("upgrade.subscriptionRequiredTitle"), description: t("upgrade.subscriptionRequired") };
    if (error.code === PlanErrorCodes.PLAN_FEATURE_LOCKED)
        return {
            title: plan ? t("upgrade.featureLockedTitle", { plan }) : t("upgrade.featureLockedTitleGeneric"),
            description: t("upgrade.featureLocked", { feature: getPlanFeatureLabel(error.feature) }),
        };
    if (error.limit && MEMBER_CAPS.includes(error.limit))
        return { title: t("upgrade.memberCapTitle"), description: t("upgrade.memberCap") };
    if (error.limit && MINUTE_LIMITS.includes(error.limit))
        return { title: t("upgrade.outOfMinutesTitle"), description: t("upgrade.outOfMinutes") };
    if (error.limit === PlanLimitKeys.SEATS_INCLUDED)
        return {
            title: t("upgrade.seatsTitle"),
            description: error.extra_seats_allowed ? t("upgrade.seatsAddMore") : t("upgrade.seats", { current: error.current, max: error.max }),
        };
    return {
        title: t("upgrade.limitTitle"),
        description: t("upgrade.limit", { limit: getPlanLimitLabel(error.limit).toLowerCase(), current: error.current, max: error.max }),
    };
}

// Shown for PLAN_LIMIT_REACHED, PLAN_FEATURE_LOCKED and SUBSCRIPTION_REQUIRED wherever they happen (§8.6): the
// axios interceptor puts the error in the plan prompt store.
export function PlanUpgradeDialog() {
    const error = usePlanPromptStore((state) => state.error);
    const dismiss = usePlanPromptStore((state) => state.dismissError);
    if (!error) return null;
    return <PlanUpgradeDialogContent error={error} onClose={dismiss} />;
}

function PlanUpgradeDialogContent({ error, onClose }: { error: PlanErrorDetails; onClose: () => void }) {
    const { t } = useTranslation("billing");
    const navigate = useNavigate();
    const { can } = usePermissions();
    const setBuyMinutesOpen = usePlanPromptStore((state) => state.setBuyMinutesOpen);
    const copy = useCopy(error);
    const canManageBilling = can(Permissions.BILLING_VIEW);
    const isMinutes = !!error.limit && MINUTE_LIMITS.includes(error.limit);
    const go = (to: string) => {
        onClose();
        navigate(to);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Lock className="size-5" />
                    </span>
                    <DialogTitle>{copy.title}</DialogTitle>
                    <DialogDescription>{copy.description}</DialogDescription>
                </DialogHeader>
                {!canManageBilling && !isMinutes && <p className="text-sm text-muted-foreground">{t("upgrade.askOwner")}</p>}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>
                        {t("actions.notNow")}
                    </Button>
                    {isMinutes && error.can_buy_minutes && (
                        <Button variant={error.next_plan ? "outline" : "default"} onClick={() => setBuyMinutesOpen(true)}>
                            <ShoppingCart /> {t("buyMinutes.button")}
                        </Button>
                    )}
                    {canManageBilling && (error.next_plan || error.code === PlanErrorCodes.SUBSCRIPTION_REQUIRED) && (
                        <Button onClick={() => go(Routes.settings.billing)}>
                            <Sparkles /> {error.next_plan ? t("upgrade.upgradeTo", { plan: getPlanLabel(error.next_plan) }) : t("upgrade.choosePlan")}
                        </Button>
                    )}
                    {!canManageBilling && error.next_plan && (
                        <Button variant="secondary" onClick={() => go(Routes.pricing)}>
                            {t("upgrade.seePlans")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
