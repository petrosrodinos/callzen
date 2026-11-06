import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes } from "@/lib/format";
import { useEntitlements } from "@/features/billing/hooks/use-billing";
import { usePlanPromptStore } from "@/stores/plan-prompt";
import { Routes } from "@/routes/routes";

// Bought minutes: the team pool and the viewer's own balance (§11a item 6). They never expire.
export function MinutesCard() {
    const { t } = useTranslation("billing");
    const { data: usage, isPending } = useEntitlements();
    const openBuyMinutes = usePlanPromptStore((state) => state.setBuyMinutesOpen);

    return (
        <Card className="gap-0 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t("page.minutes")}</h2>
                <Button variant="link" size="sm" asChild className="px-0">
                    <Link to={Routes.settings.usage}>
                        {t("page.seeUsage")} <ArrowRight className="size-3.5" />
                    </Link>
                </Button>
            </div>
            {isPending || !usage ? (
                <Skeleton className="h-16 w-full" />
            ) : (
                <>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-xs text-muted-foreground">{t("page.teamBalance")}</dt>
                            <dd className="font-medium tabular-nums">
                                {t("page.balanceValue", {
                                    live: formatMinutes(usage.live.team_credit_minutes),
                                    practice: formatMinutes(usage.practice.team_credit_minutes),
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">{t("page.yourBalance")}</dt>
                            <dd className="font-medium tabular-nums">
                                {t("page.balanceValue", {
                                    live: formatMinutes(usage.live.personal_credit_minutes),
                                    practice: formatMinutes(usage.practice.personal_credit_minutes),
                                })}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-xs text-muted-foreground">{t("page.minutesHint")}</p>
                    {usage.can_buy_topups && (
                        <Button size="sm" className="mt-3 self-start" onClick={() => openBuyMinutes(true)}>
                            <ShoppingCart /> {t("buyMinutes.button")}
                        </Button>
                    )}
                </>
            )}
        </Card>
    );
}
