import { useNavigate } from "react-router-dom";
import { useGeneratePracticeAgent } from "@/features/practice-agents/hooks/use-practice-agents";
import { Routes } from "@/routes/routes";

interface RecommendedScenario {
    scenario_description: string;
    lead_temperature: "COLD" | "WARM";
    difficulty: number;
}

// One click from a weakness to a matching practice session: generates and saves the prospect,
// then opens its briefing.
export const useStartRecommendedPractice = () => {
    const navigate = useNavigate();
    const generate = useGeneratePracticeAgent();

    const start = (scenario: RecommendedScenario, assistantAgentId?: string | null) =>
        generate.mutate(
            {
                description: scenario.scenario_description,
                lead_temperature: scenario.lead_temperature,
                difficulty: scenario.difficulty,
                assistant_agent_id: assistantAgentId ?? undefined,
                save: true,
            },
            { onSuccess: (agent) => navigate(Routes.practice.start(agent.id)) },
        );

    return { start, isPending: generate.isPending, pendingTitle: generate.variables?.description };
};
