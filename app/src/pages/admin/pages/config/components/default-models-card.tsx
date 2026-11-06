import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import type { AppConfigEntry } from "@/features/app-config/interfaces/app-config.interfaces";
import type { DefaultModels } from "@/features/catalog/interfaces/catalog.interfaces";
import { ConfigKeyCard } from "./config-key-card";
import { useConfigDraft } from "../hooks/use-config-draft";

type Slot = keyof DefaultModels;
const TEXT_SLOTS: Slot[] = ["realtime", "analysis", "utility"];
const AUDIO_SLOTS: { slot: Slot; use: "voice" | "transcription" | "upload_transcription" }[] = [
    { slot: "voice", use: "voice" },
    { slot: "transcription", use: "transcription" },
    { slot: "upload_transcription", use: "upload_transcription" },
];

// Model selection stays an internal capability (§6.3): admins pick the defaults every co-pilot without its own
// model uses, plus the voice and transcription models (§4.7a migration is a change here, no deploy).
export function DefaultModelsCard({ entry }: { entry: AppConfigEntry<DefaultModels> }) {
    const { t } = useTranslation("admin");
    const { data: catalog } = useCatalog();
    const { draft, setDraft, dirty, discard } = useConfigDraft(entry.value, entry.version);
    if (!draft) return null;

    const select = (slot: Slot, options: { id: string; label: string; hint?: string }[]) => (
        <div key={slot} className="space-y-1.5">
            <Label>{t(`config.ai.${slot}`)}</Label>
            <Select value={draft[slot]} onValueChange={(value) => setDraft({ ...draft, [slot]: value })}>
                <SelectTrigger aria-label={t(`config.ai.${slot}`)}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                            {option.label}
                            {option.hint && <span className="ml-2 text-xs text-muted-foreground">{option.hint}</span>}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <ConfigKeyCard entry={entry} title={t("config.ai.title")} draft={draft} dirty={dirty} onDiscard={discard}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TEXT_SLOTS.map((slot) => select(slot, (catalog?.ai_models ?? []).map((model) => ({ id: model.id, label: model.label }))))}
                {AUDIO_SLOTS.map(({ slot, use }) =>
                    select(
                        slot,
                        (catalog?.audio_models ?? [])
                            .filter((model) => model.uses.includes(use))
                            .map((model) => ({
                                id: model.id,
                                label: model.label,
                                hint: model.shutdown_at ? t("config.ai.shutdown", { date: model.shutdown_at }) : undefined,
                            })),
                    ),
                )}
            </div>
        </ConfigKeyCard>
    );
}
