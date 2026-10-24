import i18n from "@/i18n";

export const DifficultyFormOptions: { id: number; label: string; description: string }[] = [
    { id: 1, label: i18n.t("options:practice.difficulty.1.label"), description: i18n.t("options:practice.difficulty.1.description") },
    { id: 2, label: i18n.t("options:practice.difficulty.2.label"), description: i18n.t("options:practice.difficulty.2.description") },
    { id: 3, label: i18n.t("options:practice.difficulty.3.label"), description: i18n.t("options:practice.difficulty.3.description") },
    { id: 4, label: i18n.t("options:practice.difficulty.4.label"), description: i18n.t("options:practice.difficulty.4.description") },
    { id: 5, label: i18n.t("options:practice.difficulty.5.label"), description: i18n.t("options:practice.difficulty.5.description") },
];

export function getDifficultyLabel(value: number | string | null | undefined): string {
    return DifficultyFormOptions.find((option) => option.id === Number(value))?.label ?? "";
}

export const DifficultyFilterOptions: { id: string; label: string }[] = [
    { id: "all", label: i18n.t("options:practice.difficultyFilter.any") },
    ...DifficultyFormOptions.map((option) => ({ id: String(option.id), label: option.label })),
];

export const PatienceFormOptions: { id: number; label: string }[] = [
    { id: 1, label: i18n.t("options:practice.patience.1") },
    { id: 2, label: i18n.t("options:practice.patience.2") },
    { id: 3, label: i18n.t("options:practice.patience.3") },
    { id: 4, label: i18n.t("options:practice.patience.4") },
    { id: 5, label: i18n.t("options:practice.patience.5") },
];

export function getPatienceLabel(value: number | null | undefined): string {
    return PatienceFormOptions.find((option) => option.id === value)?.label ?? "";
}

export const ObjectionPersistenceOptions: { id: number; label: string }[] = [
    { id: 1, label: i18n.t("options:practice.persistence.1") },
    { id: 2, label: i18n.t("options:practice.persistence.2") },
    { id: 3, label: i18n.t("options:practice.persistence.3") },
];
