import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date";
import { useBillingEvents } from "@/features/billing/hooks/use-billing";
import { getPlanLabel, getSubscriptionEventTypeLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { getActorKindLabel } from "@/config/constants/dropdowns/billing/admin-billing.options";

// Timeline of plan changes from SubscriptionEvent (§11a).
export function PlanHistoryCard() {
    const { t } = useTranslation("billing");
    const { data, isPending } = useBillingEvents();

    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("page.history")}</h2>
            {isPending ? (
                <Skeleton className="h-20 w-full" />
            ) : !data?.length ? (
                <p className="text-sm text-muted-foreground">{t("page.noHistory")}</p>
            ) : (
                <ol className="relative space-y-4 border-l pl-4">
                    {data.map((event) => (
                        <li key={event.id} className="text-sm">
                            <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                            <p className="font-medium">{getSubscriptionEventTypeLabel(event.type)}</p>
                            {(event.from_plan || event.to_plan) && event.from_plan !== event.to_plan && (
                                <p className="text-muted-foreground">
                                    {event.from_plan && event.to_plan
                                        ? t("page.historyChange", { from: getPlanLabel(event.from_plan), to: getPlanLabel(event.to_plan) })
                                        : getPlanLabel(event.to_plan ?? event.from_plan)}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(event.created_at)} · {getActorKindLabel(event.actor_kind)}
                            </p>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
