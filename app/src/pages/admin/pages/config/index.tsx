import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppConfig } from "@/features/app-config/hooks/use-app-config";
import {
    AppConfigCategories,
    AppConfigKeys,
    type AnalysisVisibilityValue,
    type AppConfigCategory,
    type AppConfigEntry,
    type PlanDefinitionsValue,
} from "@/features/app-config/interfaces/app-config.interfaces";
import type { DefaultModels } from "@/features/catalog/interfaces/catalog.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { PricingTab } from "./components/pricing-tab";
import { PlansMatrixCard } from "./components/plans-matrix-card";
import { AnalysisVisibilityCard } from "./components/analysis-visibility-card";
import { DefaultModelsCard } from "./components/default-models-card";
import { JsonConfigCard } from "./components/json-config-card";

const TABS: AppConfigCategory[] = [
    AppConfigCategories.PRICING,
    AppConfigCategories.PLANS,
    AppConfigCategories.ANALYSIS,
    AppConfigCategories.AI,
    AppConfigCategories.COACHING,
    AppConfigCategories.BILLING,
];

// Keys with a typed editor; every other key in a category gets the JSON editor.
const TYPED_KEYS = new Set<string>([
    AppConfigKeys.MARKUP_PERCENT,
    AppConfigKeys.MODEL_OVERRIDES,
    AppConfigKeys.AUDIO_TOKENS_PER_MINUTE,
    AppConfigKeys.PRICING_SYNC,
    AppConfigKeys.PLAN_DEFINITIONS,
    AppConfigKeys.ANALYSIS_VISIBILITY,
    AppConfigKeys.DEFAULT_MODELS,
]);

// Runtime configuration (requirement 2): one tab per registry category, typed editors for known keys.
const AdminConfigPage: FC = () => {
    const { t } = useTranslation("admin");
    usePageMetadata({ title: t("config.title") });
    const [params, setParams] = useSearchParams();
    const tab = (TABS as string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as AppConfigCategory) : AppConfigCategories.PRICING;
    const { data, isPending } = useAppConfig();
    const entries = data ?? [];
    const find = <T,>(key: string) => entries.find((entry) => entry.key === key) as AppConfigEntry<T> | undefined;
    const generic = (category: AppConfigCategory) =>
        entries.filter((entry) => entry.category === category && !TYPED_KEYS.has(entry.key)).map((entry) => <JsonConfigCard key={entry.key} entry={entry} />);

    const planDefinitions = find<PlanDefinitionsValue>(AppConfigKeys.PLAN_DEFINITIONS);
    const visibility = find<AnalysisVisibilityValue>(AppConfigKeys.ANALYSIS_VISIBILITY);
    const defaultModels = find<DefaultModels>(AppConfigKeys.DEFAULT_MODELS);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("config.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("config.subtitle")}</p>
            </div>
            <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <TabsList className="w-max">
                        {TABS.map((item) => (
                            <TabsTrigger key={item} value={item}>
                                {t(`config.tabs.${item}`)}
                                {entries.some((entry) => entry.category === item && entry.invalid) && <span className="ml-1.5 size-1.5 rounded-full bg-destructive" />}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                {isPending ? (
                    <div className="mt-5 space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-48 w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="mt-5">
                        <TabsContent value={AppConfigCategories.PRICING}>
                            <PricingTab entries={entries} />
                        </TabsContent>
                        <TabsContent value={AppConfigCategories.PLANS} className="space-y-4">
                            {planDefinitions && <PlansMatrixCard entry={planDefinitions} />}
                            {generic(AppConfigCategories.PLANS)}
                        </TabsContent>
                        <TabsContent value={AppConfigCategories.ANALYSIS} className="space-y-4">
                            {visibility && <AnalysisVisibilityCard entry={visibility} />}
                            {generic(AppConfigCategories.ANALYSIS)}
                        </TabsContent>
                        <TabsContent value={AppConfigCategories.AI} className="space-y-4">
                            {defaultModels && <DefaultModelsCard entry={defaultModels} />}
                            {generic(AppConfigCategories.AI)}
                        </TabsContent>
                        <TabsContent value={AppConfigCategories.COACHING} className="space-y-4">
                            {generic(AppConfigCategories.COACHING)}
                        </TabsContent>
                        <TabsContent value={AppConfigCategories.BILLING} className="space-y-4">
                            {generic(AppConfigCategories.BILLING)}
                        </TabsContent>
                    </div>
                )}
            </Tabs>
        </div>
    );
};

export default AdminConfigPage;
