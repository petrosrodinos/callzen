import { OutputLanguageModes, type OutputLanguageMode } from "@/features/user/interfaces/user.interface";

export const OutputLanguageModeFormOptions: { id: OutputLanguageMode; label: string }[] = [
    { id: OutputLanguageModes.CONVERSATION, label: "Same language as the conversation" },
    { id: OutputLanguageModes.INTERFACE, label: "My interface language" },
];

export function getOutputLanguageModeLabel(value: OutputLanguageMode | string | null | undefined): string {
    return OutputLanguageModeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
