import { useEntitlements, usePlans } from "@/features/billing/hooks/use-billing";
import { PlanKeys, type PlanFeature, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";

const ORDER: PlanKey[] = [PlanKeys.TRIAL, PlanKeys.STARTER, PlanKeys.PRO, PlanKeys.COACH];

// The cheapest plan above the current one that includes the feature.
export const useNextPlanWithFeature = (feature: PlanFeature): PlanKey | null => {
    const { data: usage } = useEntitlements();
    const { data: catalog } = usePlans();
    if (!usage || !catalog) return null;
    const from = ORDER.indexOf(usage.plan);
    return (
        catalog.plans.find((plan) => plan.is_paid && ORDER.indexOf(plan.key) > from && plan.features[feature])?.key ?? null
    );
};

export const useHasFeature = (feature: PlanFeature): { hasFeature: boolean; isPending: boolean } => {
    const { data, isPending } = useEntitlements();
    return { hasFeature: !!data?.features[feature], isPending };
};

