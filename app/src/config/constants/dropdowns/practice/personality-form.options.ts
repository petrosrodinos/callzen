import { PersonalityTypes, type PersonalityType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const PersonalityFormOptions: { id: PersonalityType; label: string }[] = [
    { id: PersonalityTypes.ANALYTICAL, label: i18n.t("options:practice.personality.analytical") },
    { id: PersonalityTypes.DRIVER, label: i18n.t("options:practice.personality.driver") },
    { id: PersonalityTypes.AMIABLE, label: i18n.t("options:practice.personality.amiable") },
    { id: PersonalityTypes.EXPRESSIVE, label: i18n.t("options:practice.personality.expressive") },
    { id: PersonalityTypes.SKEPTICAL, label: i18n.t("options:practice.personality.skeptical") },
    { id: PersonalityTypes.INDECISIVE, label: i18n.t("options:practice.personality.indecisive") },
];

export function getPersonalityLabel(value: PersonalityType | string | null | undefined): string {
    return PersonalityFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
