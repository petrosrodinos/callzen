import i18n from "@/i18n";

export const formatCurrency = (value: number): string => {
    if (value > 0 && value < 0.01) return "< $0.01";
    return new Intl.NumberFormat(i18n.resolvedLanguage, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
};

export const formatNumber = (value: number): string => new Intl.NumberFormat(i18n.resolvedLanguage).format(value);

export const scoreTone = (score: number | null | undefined): "great" | "good" | "fair" | "poor" | "none" => {
    if (score === null || score === undefined) return "none";
    if (score >= 80) return "great";
    if (score >= 65) return "good";
    if (score >= 50) return "fair";
    return "poor";
};

export const initials = (value: string | null | undefined): string => {
    if (!value) return "?";
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
};

export const createClientId = (): string =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
