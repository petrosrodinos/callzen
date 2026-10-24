import { OutputLanguageModes, type OutputLanguageMode } from "@/features/user/interfaces/user.interface";
import i18n from "@/i18n";

export const OutputLanguageModeFormOptions: { id: OutputLanguageMode; label: string }[] = [
    { id: OutputLanguageModes.CONVERSATION, label: i18n.t("options:users.outputLanguageMode.conversation") },
    { id: OutputLanguageModes.INTERFACE, label: i18n.t("options:users.outputLanguageMode.interface") },
];

export function getOutputLanguageModeLabel(value: OutputLanguageMode | string | null | undefined): string {
    return OutputLanguageModeFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
