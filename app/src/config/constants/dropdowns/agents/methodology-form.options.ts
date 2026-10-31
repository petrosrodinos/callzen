import { Methodologies, type Methodology } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const MethodologyFormOptions: { id: Methodology; label: string; description: string }[] = [
    { id: Methodologies.SPIN, label: i18n.t("options:agents.methodology.spin"), description: i18n.t("options:agents.methodologyDescription.spin") },
    { id: Methodologies.BANT, label: i18n.t("options:agents.methodology.bant"), description: i18n.t("options:agents.methodologyDescription.bant") },
    { id: Methodologies.MEDDIC, label: i18n.t("options:agents.methodology.meddic"), description: i18n.t("options:agents.methodologyDescription.meddic") },
    { id: Methodologies.CHALLENGER, label: i18n.t("options:agents.methodology.challenger"), description: i18n.t("options:agents.methodologyDescription.challenger") },
    { id: Methodologies.SANDLER, label: i18n.t("options:agents.methodology.sandler"), description: i18n.t("options:agents.methodologyDescription.sandler") },
    { id: Methodologies.CUSTOM, label: i18n.t("options:agents.methodology.custom"), description: i18n.t("options:agents.methodologyDescription.custom") },
];

export function getMethodologyLabel(value: Methodology | string | null | undefined): string {
    return MethodologyFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
