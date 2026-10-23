import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const formatDate = (value: string | Date): string => format(new Date(value), "MMM d, yyyy");

export const formatDateTime = (value: string | Date): string => {
    const date = new Date(value);
    if (isToday(date)) return `Today, ${format(date, "HH:mm")}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, "HH:mm")}`;
    return format(date, "MMM d, yyyy · HH:mm");
};

export const formatShortDate = (value: string | Date): string => format(new Date(value), "MMM d");

export const formatRelative = (value: string | Date): string => formatDistanceToNow(new Date(value), { addSuffix: true });

// 75000 → "01:15", 3725000 → "1:02:05"
export const formatClock = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return hours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

// 125 → "2m 5s"
export const formatDuration = (seconds: number): string => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return secs ? `${minutes}m ${secs}s` : `${minutes}m`;
    return `${secs}s`;
};

export const daysAgoIso = (days: number): string => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
