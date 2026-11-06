import i18n from "@/i18n";
import { PricingSources, type PricingSource } from "@/features/catalog/interfaces/catalog.interfaces";

export const PricingSourceOptions: { id: PricingSource; label: string }[] = [
    { id: PricingSources.MODELS_DEV, label: i18n.t("options:billing.pricingSource.modelsDev") },
    { id: PricingSources.MODELS_DEV_ALIAS, label: i18n.t("options:billing.pricingSource.alias") },
    { id: PricingSources.ADMIN_OVERRIDE, label: i18n.t("options:billing.pricingSource.override") },
    { id: PricingSources.UNPRICED, label: i18n.t("options:billing.pricingSource.unpriced") },
];

export function getPricingSourceLabel(source: PricingSource | string): string {
    return PricingSourceOptions.find((option) => option.id === source)?.label ?? source;
}
