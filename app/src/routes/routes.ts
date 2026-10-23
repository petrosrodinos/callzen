export const Routes = {
    root: "/",
    auth: {
        sign_in: "/auth/sign-in",
        sign_up: "/auth/sign-up",
    },
    admin: {
        health: "/admin/health",
        users: "/admin/users",
        alerts: "/admin/alerts",
    },
    dashboard: "/dashboard",
    calls: {
        new: "/calls/new",
        live: (callId: string) => `/calls/${callId}/live`,
        live_pattern: "/calls/:callId/live",
    },
    practice: {
        root: "/practice",
        start: (practiceAgentId: string) => `/practice/start/${practiceAgentId}`,
        start_pattern: "/practice/start/:practiceAgentId",
        session: (callId: string) => `/practice/session/${callId}`,
        session_pattern: "/practice/session/:callId",
        agents_new: "/practice/agents/new",
        agent: (id: string) => `/practice/agents/${id}`,
        agent_pattern: "/practice/agents/:id",
    },
    assistant_agents: {
        root: "/assistant-agents",
        new: "/assistant-agents/new",
        detail: (id: string) => `/assistant-agents/${id}`,
        detail_pattern: "/assistant-agents/:id",
    },
    library: {
        root: "/library",
        detail: (callId: string) => `/library/${callId}`,
        detail_pattern: "/library/:callId",
    },
    organisation: {
        root: "/organisation",
        tab: (tab: string) => `/organisation?tab=${tab}`,
    },
    invite: {
        accept: (token: string) => `/invite/${token}`,
        pattern: "/invite/:token",
    },
    settings: {
        root: "/settings",
        usage: "/settings/usage",
        privacy: "/settings/privacy",
    },
};
