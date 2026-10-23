const STORAGE_KEY = "callzen:post-login-redirect";

// Only same-site paths are accepted so a crafted link can't send people elsewhere after signing in.
export const isSafeRedirect = (value: string | null | undefined): value is string => !!value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");

export const rememberRedirect = (path: string) => {
    try {
        sessionStorage.setItem(STORAGE_KEY, path);
    } catch {
        // Storage can be unavailable; the query parameter still works.
    }
};

export const consumeRedirect = (search: string): string | null => {
    const fromQuery = new URLSearchParams(search).get("redirect");
    let stored: string | null = null;
    try {
        stored = sessionStorage.getItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        stored = null;
    }
    if (isSafeRedirect(fromQuery)) return fromQuery;
    return isSafeRedirect(stored) ? stored : null;
};
