import { Methodologies, type Methodology } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import i18n from "@/i18n";

export const MethodologyFormOptions: { id: Methodology; label: string }[] = [
    { id: Methodologies.SPIN, label: i18n.t("options:agents.methodology.spin") },
    { id: Methodologies.BANT, label: i18n.t("options:agents.methodology.bant") },
    { id: Methodologies.MEDDIC, label: i18n.t("options:agents.methodology.meddic") },
    { id: Methodologies.CHALLENGER, label: i18n.t("options:agents.methodology.challenger") },
    { id: Methodologies.SANDLER, label: i18n.t("options:agents.methodology.sandler") },
    { id: Methodologies.CUSTOM, label: i18n.t("options:agents.methodology.custom") },
];

export function getMethodologyLabel(value: Methodology | string | null | undefined): string {
    return MethodologyFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
