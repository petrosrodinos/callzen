import { z } from "zod";
import { SuggestionFrequencies, SuggestionLengths } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";

export const assistantAgentSchema = z.object({
    name: z.string().trim().min(1, "Give your co-pilot a name").max(120),
    description: z.string().max(1000),
    call_goal: z.string().max(300),
    script: z.array(
        z.object({
            id: z.string(),
            stage: z.string().min(1),
            title: z.string().max(120),
            content: z.string().trim().min(1, "Write what to say in this stage").max(4000),
        }),
    ),
    instructions: z.string().max(5000),
    knowledge: z.string().max(60000, "Knowledge is limited to 60,000 characters"),
    objection_library: z.array(
        z.object({
            id: z.string(),
            objection: z.string().trim().min(1, "Describe the objection").max(500),
            response: z.string().trim().min(1, "Write your preferred response").max(2000),
        }),
    ),
    methodology: z.string(),
    language: z.string().min(2),
    tone: z.string(),
    suggestion_frequency: z.enum([SuggestionFrequencies.OBJECTIONS_ONLY, SuggestionFrequencies.BALANCED, SuggestionFrequencies.CONSTANT]),
    suggestion_length: z.enum([SuggestionLengths.SHORT, SuggestionLengths.MEDIUM]),
    alternatives_count: z.number().int().min(0).max(2),
    realtime_model: z.string().min(1),
    analysis_model: z.string().min(1),
    analysis_criteria: z
        .array(
            z.object({
                key: z.string().min(1),
                label: z.string().trim().min(1, "Name the category").max(120),
                weight: z.number().min(0).max(5),
                description: z.string().max(500).optional(),
            }),
        )
        .min(1, "Keep at least one scoring category"),
    consent_line: z.string().max(1000),
    suggest_consent_line: z.boolean(),
    is_default: z.boolean(),
});

export type AssistantAgentFormValues = z.infer<typeof assistantAgentSchema>;
