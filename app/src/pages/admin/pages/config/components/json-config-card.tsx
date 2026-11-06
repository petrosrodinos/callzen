import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import type { AppConfigEntry } from "@/features/app-config/interfaces/app-config.interfaces";
import { ConfigKeyCard } from "./config-key-card";

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

// Fallback editor for keys without a typed editor. The server validates the value against the key's schema.
export function JsonConfigCard({ entry, title }: { entry: AppConfigEntry; title?: string }) {
    const { t } = useTranslation("admin");
    const [state, setState] = useState({ version: entry.version, text: stringify(entry.value) });
    // A newer stored version replaces the local text (adjusting state while rendering).
    if (state.version !== entry.version) setState({ version: entry.version, text: stringify(entry.value) });
    const text = state.version === entry.version ? state.text : stringify(entry.value);
    const setText = (next: string) => setState({ version: entry.version, text: next });

    let parsed: unknown = null;
    let error: string | null = null;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        error = (e as Error).message;
    }

    return (
        <ConfigKeyCard
            entry={entry}
            title={title}
            draft={error ? null : parsed}
            dirty={text !== stringify(entry.value)}
            onDiscard={() => setText(stringify(entry.value))}
        >
            <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="min-h-40 font-mono text-xs"
                spellCheck={false}
                aria-label={entry.key}
            />
            {error && <p className="mt-1 text-xs text-destructive">{t("config.invalidJson", { error })}</p>}
        </ConfigKeyCard>
    );
}
