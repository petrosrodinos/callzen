import { useMemo, useState } from "react";

// Local editable copy of a config value. It resets whenever the stored version changes (after a save, a reset or
// someone else's edit), so the editor never silently overwrites a newer value.
export function useConfigDraft<T>(value: T | undefined, version: number | undefined) {
    const [state, setState] = useState<{ version: number | undefined; draft: T | undefined }>({ version, draft: value });
    // Adjusting state while rendering (React's recommended alternative to a syncing effect).
    if (state.version !== version) setState({ version, draft: value });
    const draft = state.version === version ? state.draft : value;
    const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(value), [draft, value]);
    return {
        draft,
        setDraft: (next: T) => setState({ version, draft: next }),
        dirty,
        discard: () => setState({ version, draft: value }),
    };
}
