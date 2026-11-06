import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalysisTeasers } from "@/features/calls/interfaces/calls.interfaces";
import { useEntitlements, usePlans } from "@/features/billing/hooks/use-billing";
import { PlanKeys, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getAnalysisFeatureLabel, type AnalysisFeatureKey } from "@/config/constants/dropdowns/billing/analysis-feature.options";
import { getPlanLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { Routes } from "@/routes/routes";

const ORDER: PlanKey[] = [PlanKeys.TRIAL, PlanKeys.STARTER, PlanKeys.PRO, PlanKeys.COACH];

// The cheapest paid plan above the current one that shows this analysis section.
const useUnlockPlan = (feature: AnalysisFeatureKey): PlanKey | null => {
    const { data: usage } = useEntitlements();
    const { data: catalog } = usePlans();
    const visibility = catalog?.analysis_visibility;
    if (!usage || !visibility) return null;
    const from = ORDER.indexOf(usage.plan);
    return ORDER.find((plan) => plan !== PlanKeys.TRIAL && ORDER.indexOf(plan) > from && visibility[plan]?.[feature]) ?? null;
};

const teaserText = (t: (key: string, options?: Record<string, unknown>) => string, feature: AnalysisFeatureKey, teasers: AnalysisTeasers) => {
    switch (feature) {
        case "moments":
            return teasers.moments
                ? t("locked.moments", { mistakes: teasers.moments.mistakes, strengths: teasers.moments.strengths })
                : null;
        case "improvements":
            return teasers.improvements != null ? t("locked.improvements", { count: teasers.improvements }) : null;
        case "next_steps":
            return teasers.next_steps != null ? t("locked.nextSteps", { count: teasers.next_steps }) : null;
        case "suggested_practice":
            return teasers.suggested_practice != null ? t("locked.suggestedPractice", { count: teasers.suggested_practice }) : null;
        case "category_scores":
            return teasers.category_scores != null ? t("locked.categoryScores", { count: teasers.category_scores }) : null;
        default:
            return null;
    }
};

// Blurred placeholder shown instead of a locked section: counts only, never content (§9.4).
export function LockedAnalysisCard({ feature, teasers, className }: { feature: AnalysisFeatureKey; teasers: AnalysisTeasers; className?: string }) {
    const { t } = useTranslation("billing");
    const { can } = usePermissions();
    const plan = useUnlockPlan(feature);
    return (
        <Card className={cn("relative overflow-hidden p-5", className)}>
            <div aria-hidden className="pointer-events-none select-none space-y-2 opacity-60 blur-[3px]">
                {[80, 65, 72].map((width) => (
                    <div key={width} className="h-3 rounded bg-muted-foreground/30" style={{ width: `${width}%` }} />
                ))}
            </div>
            <div className="relative mt-4 flex flex-col items-start gap-2">
                <p className="flex items-center gap-2 font-medium">
                    <Lock className="size-4 text-primary" /> {getAnalysisFeatureLabel(feature)}
                </p>
                <p className="text-sm text-muted-foreground">{teaserText(t, feature, teasers) ?? t("locked.generic")}</p>
                {can(Permissions.BILLING_VIEW) ? (
                    <Button size="sm" asChild>
                        <Link to={Routes.settings.billing}>
                            <Sparkles /> {plan ? t("locked.unlockWith", { plan: getPlanLabel(plan) }) : t("locked.unlock")}
                        </Link>
                    </Button>
                ) : (
                    <p className="text-xs text-muted-foreground">{plan ? t("locked.availableOn", { plan: getPlanLabel(plan) }) : null}</p>
                )}
            </div>
        </Card>
    );
}

