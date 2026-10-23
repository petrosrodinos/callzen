export const DifficultyFormOptions: { id: number; label: string; description: string }[] = [
    { id: 1, label: "Very easy", description: "Friendly and open, almost no objections." },
    { id: 2, label: "Easy", description: "Open, a couple of mild objections, converts readily." },
    { id: 3, label: "Medium", description: "Some skepticism and genuine objections. Needs good discovery." },
    { id: 4, label: "Hard", description: "Guarded and busy, tough repeated objections, may hang up early." },
    { id: 5, label: "Very hard", description: "Hostile to sales calls. Converts only with excellent technique." },
];

export function getDifficultyLabel(value: number | string | null | undefined): string {
    return DifficultyFormOptions.find((option) => option.id === Number(value))?.label ?? "";
}

export const DifficultyFilterOptions: { id: string; label: string }[] = [
    { id: "all", label: "Any difficulty" },
    ...DifficultyFormOptions.map((option) => ({ id: String(option.id), label: option.label })),
];

export const PatienceFormOptions: { id: number; label: string }[] = [
    { id: 1, label: "Hangs up almost immediately" },
    { id: 2, label: "Impatient" },
    { id: 3, label: "Average" },
    { id: 4, label: "Patient" },
    { id: 5, label: "Very patient" },
];

export function getPatienceLabel(value: number | null | undefined): string {
    return PatienceFormOptions.find((option) => option.id === value)?.label ?? "";
}

export const ObjectionPersistenceOptions: { id: number; label: string }[] = [
    { id: 1, label: "Drops it easily" },
    { id: 2, label: "Raises it again once" },
    { id: 3, label: "Keeps coming back" },
];
