import { z } from "zod";
import { CallTypes } from "@/features/calls/interfaces/calls.interfaces";

export const newCallSchema = z.object({
    call_type: z.enum([CallTypes.MICROPHONE, CallTypes.ONLINE_MEETING]),
    assistant_agent_id: z.string().min(1, "Choose a co-pilot"),
    prospect_name: z.string().max(120),
    prospect_company: z.string().max(120),
    prospect_role: z.string().max(120),
    goal: z.string().max(300),
    context_notes: z.string().max(4000),
    prior_call_id: z.string(),
    language: z.string().min(2),
    keep_recording: z.boolean(),
    consent_acknowledged: z.boolean(),
});

export type NewCallFormValues = z.infer<typeof newCallSchema>;
