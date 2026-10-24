import i18n from "@/i18n";

export const AgentStatusFilterOptions: { id: "active" | "archived" | "all"; label: string }[] = [
    { id: "active", label: i18n.t("options:agents.status.active") },
    { id: "archived", label: i18n.t("options:agents.status.archived") },
    { id: "all", label: i18n.t("options:agents.status.all") },
];
