import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Save } from "lucide-react";
import { FormSection } from "@/components/ui/form-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpdateAgentAccess } from "@/features/agent-access/hooks/use-agent-access";
import { AgentVisibilities, type AgentKind, type AgentVisibility } from "@/features/agent-access/interfaces/agent-access.interfaces";
import { AgentVisibilityFormOptions, getAgentVisibilityDescription } from "@/config/constants/dropdowns/agents/agent-visibility-form.options";
import { MemberPicker } from "./member-picker";
import { useAccessCapabilities } from "./use-access-capabilities";

interface AgentAccessCardProps {
    kind: AgentKind;
    agent: { id: string; user_id: string | null; visibility: AgentVisibility; access_user_ids?: string[] };
}

// "Who can use this" in the co-pilot and prospect editors (§10.1h). Saved on its own, separately from the form.
export function AgentAccessCard({ kind, agent }: AgentAccessCardProps) {
    const { t } = useTranslation("access");
    const { canManageAccess, managesAll, userId, isPending } = useAccessCapabilities(kind);
    const update = useUpdateAgentAccess();
    const [visibility, setVisibility] = useState<AgentVisibility>(agent.visibility);
    const [userIds, setUserIds] = useState<string[]>(agent.access_user_ids ?? []);
    const isAuthor = !!userId && agent.user_id === userId;

    if (isPending) return null;

    if (!canManageAccess) {
        if (agent.visibility !== AgentVisibilities.SELECTED) return null;
        // Students see who can see their own private prospect; managers on a downgraded plan see the kept restriction.
        if (!isAuthor && !managesAll) return null;
        return (
            <p className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                {isAuthor && !managesAll
                    ? t("editor.onlyYouAndCoach")
                    : t("editor.restrictedReadOnly", { count: agent.access_user_ids?.length ?? 0 })}
            </p>
        );
    }

    const dirty =
        visibility !== agent.visibility ||
        (visibility === AgentVisibilities.SELECTED &&
            [...userIds].sort().join() !== [...(agent.access_user_ids ?? [])].sort().join());

    return (
        <FormSection
            className="mb-4"
            title={t("editor.title")}
            description={t(`editor.description.${kind}`)}
            actions={
                <Button
                    size="sm"
                    disabled={!dirty || update.isPending}
                    loading={update.isPending}
                    onClick={() =>
                        update.mutate({
                            kind,
                            id: agent.id,
                            dto: { visibility, user_ids: visibility === AgentVisibilities.SELECTED ? userIds : [] },
                        })
                    }
                >
                    {!update.isPending && <Save />} {t("editor.save")}
                </Button>
            }
        >
            <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as AgentVisibility)} className="grid gap-2 sm:grid-cols-2">
                {AgentVisibilityFormOptions.map((option) => (
                    <Label key={option.id} htmlFor={`visibility-${option.id}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[:checked]:border-primary">
                        <RadioGroupItem id={`visibility-${option.id}`} value={option.id} className="mt-0.5" />
                        <span>
                            <span className="block font-medium">{option.label}</span>
                            <span className="block text-xs text-muted-foreground">{getAgentVisibilityDescription(option.id)}</span>
                        </span>
                    </Label>
                ))}
            </RadioGroup>
            {visibility === AgentVisibilities.SELECTED && (
                <div className="space-y-1.5">
                    <Label>{t("editor.students")}</Label>
                    <MemberPicker value={userIds} onChange={setUserIds} />
                    {!userIds.length && <p className="text-xs text-muted-foreground">{t("editor.noneSelected")}</p>}
                </div>
            )}
        </FormSection>
    );
}
