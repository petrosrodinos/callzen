import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";
import { useActiveOrganisation } from "@/features/organisations/hooks/use-organisations";
import { getPlanLabel, getSubscriptionStatusLabel } from "@/config/constants/dropdowns/billing/plan.options";

// Read-only plan summary for members without billing.view (§11a "Who sees what").
export function YourPlanCard() {
    const { t } = useTranslation("billing");
    const { organisation } = useActiveOrganisation();
    const plan = organisation?.plan;
    if (!plan) return null;

    return (
        <Card className="gap-0 p-5">
            <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{t("page.planName", { plan: getPlanLabel(plan.key) })}</h2>
                <Badge variant={plan.read_only ? "destructive" : "secondary"}>{getSubscriptionStatusLabel(plan.status)}</Badge>
            </div>
            {plan.trial_ends_at && <p className="mt-1 text-sm text-muted-foreground">{t("meters.trialEnds", { date: formatDate(plan.trial_ends_at) })}</p>}
            <p className="mt-3 text-sm text-muted-foreground">{t("page.askOwnerBilling", { organisation: organisation?.name })}</p>
        </Card>
    );
}
