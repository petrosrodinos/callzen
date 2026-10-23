import { PersonalityTypes, type PersonalityType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const PersonalityFormOptions: { id: PersonalityType; label: string }[] = [
    { id: PersonalityTypes.ANALYTICAL, label: "Analytical" },
    { id: PersonalityTypes.DRIVER, label: "Driver / direct" },
    { id: PersonalityTypes.AMIABLE, label: "Amiable / friendly" },
    { id: PersonalityTypes.EXPRESSIVE, label: "Expressive / talkative" },
    { id: PersonalityTypes.SKEPTICAL, label: "Skeptical" },
    { id: PersonalityTypes.INDECISIVE, label: "Indecisive" },
];

export function getPersonalityLabel(value: PersonalityType | string | null | undefined): string {
    return PersonalityFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
