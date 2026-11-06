export const AgentVisibilities = {
    ORGANISATION: "ORGANISATION",
    SELECTED: "SELECTED",
} as const;
export type AgentVisibility = (typeof AgentVisibilities)[keyof typeof AgentVisibilities];

export const AgentKinds = {
    COPILOT: "copilot",
    PROSPECT: "prospect",
} as const;
export type AgentKind = (typeof AgentKinds)[keyof typeof AgentKinds];

export const AgentAccessErrorCodes = {
    NO_SHARED_COPILOT: "NO_SHARED_COPILOT",
    CANNOT_SHARE_PRIVATE_PROSPECT: "CANNOT_SHARE_PRIVATE_PROSPECT",
    ACCESS_USER_NOT_A_MEMBER: "ACCESS_USER_NOT_A_MEMBER",
} as const;

// PUT /assistant-agents/:id/access and PUT /practice-agents/:id/access — replaces the whole list.
export interface UpdateAgentAccessDto {
    visibility: AgentVisibility;
    user_ids: string[];
}

export interface AgentAccessResult {
    id: string;
    visibility: AgentVisibility;
    access_user_ids: string[];
}

export interface StudentAccessItem {
    id: string;
    name: string;
    visibility: AgentVisibility;
    has_access: boolean;
    is_private_to_student: boolean;
    author_id: string | null;
    archived: boolean;
}

// GET /coaching/students/:userId/access
export interface StudentAccess {
    user_id: string;
    copilots: StudentAccessItem[];
    prospects: StudentAccessItem[];
}

// PUT /coaching/students/:userId/access — the SELECTED items this student is on.
export interface UpdateStudentAccessDto {
    assistant_agent_ids: string[];
    practice_agent_ids: string[];
}

// POST /agent-access/share
export interface ShareAgentsDto {
    assistant_agent_ids?: string[];
    practice_agent_ids?: string[];
    user_ids: string[];
}

export interface ShareAgentsResult {
    shared: { kind: AgentKind; id: string; added_user_ids: string[] }[];
}
