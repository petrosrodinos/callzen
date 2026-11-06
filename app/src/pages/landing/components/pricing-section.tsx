import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { formatMoney } from "@/lib/format";
import { usePublicPlans } from "@/features/billing/hooks/use-billing";
import { PlanFeatures, PlanKeys, type CatalogPlan, type PlanKey } from "@/features/billing/interfaces/billing.interfaces";

const PLANS: { key: PlanKey; slug: "starter" | "pro" | "coach"; featured?: boolean }[] = [
    { key: PlanKeys.STARTER, slug: "starter" },
    { key: PlanKeys.PRO, slug: "pro", featured: true },
    { key: PlanKeys.COACH, slug: "coach" },
];

// Static copy, used until (or if) the public plan catalog cannot be loaded. Only points without numbers, so it can
// never contradict the admin-configured limits.
const FALLBACK_POINTS: Record<string, string[]> = {
    starter: ["basicAnalysis"],
    pro: ["fullAnalysis", "knowledge"],
    coach: ["pool", "tools", "access"],
};

// Points built from the live plan definitions (admin-editable limits, features and analysis visibility).
function usePlanPoints() {
    const { t } = useTranslation("landing");
    const { data } = usePublicPlans();
    if (!data) return null;
    const visibility = data.analysis_visibility;

    return (plan: CatalogPlan, slug: string): string[] => {
        const { limits, features } = plan;
        const points: string[] = [];
        if (limits.seats_included > 1)
            points.push(
                t("pricing.live.students", { count: limits.seats_included - 1 }) +
                    (limits.extra_seats_allowed ? ` ${t("pricing.live.moreSeats")}` : ""),
            );
        points.push(
            limits.live_minutes_per_period == null
                ? t("pricing.live.liveUnlimited")
                : t("pricing.live.liveMinutes", { count: limits.live_minutes_per_period }),
        );
        if (!limits.practice_shares_live_pool)
            points.push(
                limits.practice_minutes_per_period == null
                    ? t("pricing.live.practiceUnlimited")
                    : t("pricing.live.practiceMinutes", { count: limits.practice_minutes_per_period }),
            );
        points.push(
            limits.copilots_max == null && limits.practice_prospects_max == null
                ? t("pricing.live.agentsUnlimited")
                : t("pricing.live.agents", {
                      count: limits.copilots_max ?? 0,
                      prospects: limits.practice_prospects_max ?? "∞",
                  }),
        );
        const fullAnalysis = visibility ? Object.values(visibility[plan.key] ?? {}).every(Boolean) : slug !== "starter";
        points.push(t(`pricing.plans.${fullAnalysis ? "pro.points.fullAnalysis" : "starter.points.basicAnalysis"}`));
        if (features[PlanFeatures.KNOWLEDGE_DOCUMENT_IMPORT]) points.push(t("pricing.plans.pro.points.knowledge"));
        if (limits.live_minutes_reserved_for_owner_per_period || limits.live_minutes_per_member_per_period)
            points.push(t("pricing.plans.coach.points.pool"));
        if (features[PlanFeatures.COHORT_DASHBOARD]) points.push(t("pricing.plans.coach.points.tools"));
        if (features[PlanFeatures.AGENT_ACCESS_CONTROL]) points.push(t("pricing.plans.coach.points.access"));
        return points;
    };
}

export function PricingSection() {
    const { t } = useTranslation("landing");
    const { data } = usePublicPlans();
    const buildPoints = usePlanPoints();
    // The trial length follows the admin-configured TRIAL limits.
    const trialDays = data?.plans.find((p) => p.key === PlanKeys.TRIAL)?.limits.trial_days;

    return (
        <section id="pricing" className="lz-section" aria-labelledby="pricing-title">
            <div className="lz-wrap">
                <h2 id="pricing-title" className="lz-h2">
                    {t("pricing.title")}
                </h2>
                <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
                    {t("pricing.copy")}
                </p>
                <div className="lz-pricing">
                    {PLANS.map((item) => {
                        const plan = data?.plans.find((p) => p.key === item.key);
                        const points =
                            plan && buildPoints
                                ? buildPoints(plan, item.slug)
                                : FALLBACK_POINTS[item.slug].map((point) => t(`pricing.plans.${item.slug}.points.${point}`));
                        const monthly = plan?.prices?.monthly;
                        return (
                            <article key={item.key} className={item.featured ? "lz-plan lz-plan--featured" : "lz-plan"}>
                                <h3 className="lz-plan__name">{t(`pricing.plans.${item.slug}.name`)}</h3>
                                {monthly && (
                                    <p className="lz-plan__tagline">
                                        {t("pricing.live.perMonth", { price: formatMoney(monthly.amount_cents, monthly.currency) })}
                                    </p>
                                )}
                                <p className="lz-plan__tagline">{t(`pricing.plans.${item.slug}.tagline`)}</p>
                                <ul className="lz-plan__points">
                                    {points.map((point) => (
                                        <li key={point}>{point}</li>
                                    ))}
                                </ul>
                            </article>
                        );
                    })}
                </div>
                <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
                    {trialDays ? t("pricing.live.trial", { count: trialDays }) : t("pricing.trial")}{" "}
                    <Link to={Routes.auth.sign_up} className="lz-btn lz-btn--primary" style={{ marginLeft: "0.5rem" }}>
                        {t("pricing.cta")}
                    </Link>
                </p>
            </div>
        </section>
    );
}
