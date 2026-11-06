import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanFeature } from "@/features/billing/interfaces/billing.interfaces";
import { useHasFeature, useNextPlanWithFeature } from "@/hooks/use-plan-features";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { getPlanFeatureLabel } from "@/config/constants/dropdowns/billing/plan-feature.options";
import { Routes } from "@/routes/routes";

interface PlanGateProps {
    feature: PlanFeature;
    children: ReactNode;
    // "card" replaces the content with an upgrade card; "hide" renders nothing; a node renders that instead.
    fallback?: "card" | "hide" | ReactNode;
    className?: string;
}

// UI courtesy only: the API enforces the same plan features (403 PLAN_FEATURE_LOCKED).
export function PlanGate({ feature, children, fallback = "card", className }: PlanGateProps) {
    const { hasFeature, isPending } = useHasFeature(feature);
    if (isPending) return null;
    if (hasFeature) return <>{children}</>;
    if (fallback === "hide") return null;
    if (fallback !== "card") return <>{fallback}</>;
    return <LockedFeatureCard feature={feature} className={className} />;
}

export function LockedFeatureCard({ feature, className, description }: { feature: PlanFeature; className?: string; description?: string }) {
    const { t } = useTranslation("billing");
    const navigate = useNavigate();
    const { can } = usePermissions();
    const nextPlan = useNextPlanWithFeature(feature);
    return (
        <Card className={cn("flex flex-col items-start gap-3 border-dashed p-5", className)}>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="size-4" />
            </span>
            <div>
                <p className="font-medium">
                    {nextPlan ? t("upgrade.featureLockedTitle", { plan: getPlanLabel(nextPlan) }) : t("upgrade.featureLockedTitleGeneric")}
                </p>
                <p className="text-sm text-muted-foreground">{description ?? t("upgrade.featureLocked", { feature: getPlanFeatureLabel(feature) })}</p>
            </div>
            {can(Permissions.BILLING_VIEW) ? (
                <Button size="sm" onClick={() => navigate(Routes.settings.billing)}>
                    <Sparkles /> {nextPlan ? t("upgrade.upgradeTo", { plan: getPlanLabel(nextPlan) }) : t("upgrade.choosePlan")}
                </Button>
            ) : (
                <p className="text-xs text-muted-foreground">{t("upgrade.askOwner")}</p>
            )}
        </Card>
    );
}
