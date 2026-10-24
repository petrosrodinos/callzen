import { BudgetTypes, type BudgetType } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import i18n from "@/i18n";

export const BudgetFormOptions: { id: BudgetType; label: string }[] = [
    { id: BudgetTypes.NO_BUDGET, label: i18n.t("options:practice.budget.none") },
    { id: BudgetTypes.LIMITED, label: i18n.t("options:practice.budget.limited") },
    { id: BudgetTypes.BUDGET_AVAILABLE, label: i18n.t("options:practice.budget.available") },
    { id: BudgetTypes.PRICE_SENSITIVE, label: i18n.t("options:practice.budget.priceSensitive") },
];

export function getBudgetLabel(value: BudgetType | string | null | undefined): string {
    return BudgetFormOptions.find((option) => option.id === value)?.label ?? (value ? String(value) : "");
}
