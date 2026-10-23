export function getDropdownOptionLabel<T extends string | number>(options: { id: T; label: string }[], value: T | string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    return options.find((option) => option.id === value)?.label ?? String(value);
}
