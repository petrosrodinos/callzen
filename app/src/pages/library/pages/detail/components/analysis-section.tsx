import type { ReactNode } from "react";
import type { CallAnalysis } from "@/features/calls/interfaces/calls.interfaces";
import type { AnalysisFeatureKey } from "@/config/constants/dropdowns/billing/analysis-feature.options";
import { LockedAnalysisCard } from "@/components/billing/locked-analysis-card";

const isAnalysisLocked = (analysis: Pick<CallAnalysis, "locked_features">, feature: AnalysisFeatureKey) =>
    !!analysis.locked_features?.includes(feature);

// Renders the section, or the locked teaser when the plan hides it.
export function AnalysisSection({ analysis, feature, children, className }: { analysis: CallAnalysis; feature: AnalysisFeatureKey; children: ReactNode; className?: string }) {
    if (isAnalysisLocked(analysis, feature)) return <LockedAnalysisCard feature={feature} teasers={analysis.teasers ?? {}} className={className} />;
    return <>{children}</>;
}
