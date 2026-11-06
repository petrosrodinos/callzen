import { useAuthStore } from "@/stores/auth";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { PlanFeatures } from "@/features/billing/interfaces/billing.interfaces";
import { useHasFeature } from "@/hooks/use-plan-features";
import { AgentKinds, type AgentKind } from "@/features/agent-access/interfaces/agent-access.interfaces";

// Who may change access (§10.1h): agents.manage for co-pilots, prospects.manage_all for prospects, and only
// on a plan with agent_access_control. Existing restrictions are still shown after a downgrade.
export const useAccessCapabilities = (kind: AgentKind) => {
    const { can } = usePermissions();
    const { hasFeature, isPending } = useHasFeature(PlanFeatures.AGENT_ACCESS_CONTROL);
    const userId = useAuthStore((state) => state.user_uuid);
    const managesAll = kind === AgentKinds.COPILOT ? can(Permissions.AGENTS_MANAGE) : can(Permissions.PROSPECTS_MANAGE_ALL);
    return {
        userId,
        hasFeature,
        isPending,
        // Sees every item of this kind (rule 3).
        managesAll,
        canManageAccess: hasFeature && managesAll,
    };
};
