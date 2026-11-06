import { useTranslation } from "react-i18next";
import { Bot, Globe, Headphones, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentAccess, useUpdateStudentAccess } from "@/features/agent-access/hooks/use-agent-access";
import { AgentVisibilities, type StudentAccess, type StudentAccessItem } from "@/features/agent-access/interfaces/agent-access.interfaces";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { PlanFeatures } from "@/features/billing/interfaces/billing.interfaces";
import { useHasFeature } from "@/hooks/use-plan-features";

// Ids of the restricted (SELECTED) items this student is on, which is what the PUT replaces.
const selectedIds = (items: StudentAccessItem[]) =>
    items.filter((item) => item.visibility === AgentVisibilities.SELECTED && item.has_access).map((item) => item.id);

// Access section of the student page (§10.1h UI): every co-pilot and prospect with a toggle for this student,
// so a coach can set one student up without opening each item.
export function StudentAccessSection({ userId }: { userId: string }) {
    const { t } = useTranslation("access");
    const { can } = usePermissions();
    const { hasFeature } = useHasFeature(PlanFeatures.AGENT_ACCESS_CONTROL);
    const { data, isPending } = useStudentAccess(userId, can(Permissions.COACHING_VIEW));
    const update = useUpdateStudentAccess();
    const editable = hasFeature && can(Permissions.COACHING_MANAGE);

    const toggle = (access: StudentAccess, kind: "copilots" | "prospects", item: StudentAccessItem, value: boolean) => {
        const next = (items: StudentAccessItem[], target: boolean) => {
            const ids = selectedIds(items);
            if (!target) return ids;
            return value ? [...ids, item.id] : ids.filter((id) => id !== item.id);
        };
        update.mutate({
            userId,
            dto: {
                assistant_agent_ids: next(access.copilots, kind === "copilots"),
                practice_agent_ids: next(access.prospects, kind === "prospects"),
            },
        });
    };

    if (!can(Permissions.COACHING_VIEW)) return null;

    return (
        <Card className="gap-0 p-5">
            <h2 className="font-semibold">{t("student.title")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{editable ? t("student.description") : t("student.descriptionReadOnly")}</p>
            {isPending || !data ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {(
                        [
                            { kind: "copilots", icon: Bot, title: t("student.copilots"), items: data.copilots },
                            { kind: "prospects", icon: Headphones, title: t("student.prospects"), items: data.prospects },
                        ] as const
                    ).map((group) => (
                        <section key={group.kind}>
                            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                                <group.icon className="size-4 text-muted-foreground" /> {group.title}
                            </h3>
                            {!group.items.length ? (
                                <p className="text-sm text-muted-foreground">{t("student.none")}</p>
                            ) : (
                                <ul className="divide-y rounded-lg border">
                                    {group.items.map((item) => {
                                        const everyone = item.visibility === AgentVisibilities.ORGANISATION;
                                        return (
                                            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm">{item.name}</p>
                                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                                        {everyone && (
                                                            <Badge variant="outline" className="gap-1 text-[10px]">
                                                                <Globe className="size-3" /> {t("badge.everyone")}
                                                            </Badge>
                                                        )}
                                                        {item.is_private_to_student && (
                                                            <Badge variant="outline" className="gap-1 text-[10px]">
                                                                <Lock className="size-3" /> {t("student.privateToStudent")}
                                                            </Badge>
                                                        )}
                                                        {item.archived && (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {t("student.archived")}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={everyone || item.has_access}
                                                    disabled={!editable || everyone || item.is_private_to_student || update.isPending}
                                                    onCheckedChange={(value) => toggle(data, group.kind, item, value)}
                                                    aria-label={t("student.toggleAria", { name: item.name })}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            )}
        </Card>
    );
}
