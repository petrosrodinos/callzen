import { BudgetTypes, type BudgetType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";

export const BudgetFormOptions: { id: BudgetType; label: string }[] = [
    { id: BudgetTypes.NO_BUDGET, label: "No budget" },
    { id: BudgetTypes.LIMITED, label: "Limited budget" },
    { id: BudgetTypes.BUDGET_AVAILABLE, label: "Budget available" },
    { id: BudgetTypes.PRICE_SENSITIVE, label: "Price-sensitive" },
];

export function getBudgetLabel(value: BudgetType | string | null | undefined): string {
    return BudgetFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
