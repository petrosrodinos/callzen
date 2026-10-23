import { useState, type FC } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bot, Building2, Clock, Eye, EyeOff, Info, Pencil, Phone, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MicCheck } from "@/components/ui/live-assist/mic-check";
import { usePracticeAgent } from "@/features/practice-agents/hooks/use-practice-agents";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useMe } from "@/features/user/hooks/use-user";
import { useStartPracticeCall } from "@/features/calls/hooks/use-calls";
import type { VoiceProvider } from "@/features/catalog/interfaces/catalog.interfaces";
import type { PracticeAgent } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import type { AssistantAgent } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import { getLeadTemperatureLabel, LeadTemperatureDescriptionOptions } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { DifficultyFormOptions } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { getScenarioTypeLabel } from "@/config/constants/dropdowns/practice/scenario-type-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { VoicePicker } from "../../components/voice-picker";
import { DifficultyDots } from "../../components/difficulty-dots";

const PracticeStartPage: FC = () => {
  const { practiceAgentId } = useParams<{ practiceAgentId: string }>();
  const { data: agent, isPending } = usePracticeAgent(practiceAgentId);
  const { data: assistants, isPending: assistantsPending } = useAssistantAgents({ status: "active" });
  const { data: me, isPending: mePending } = useMe();

  usePageMetadata({ title: agent ? `Practice: ${agent.name}` : "Practice" });

  if (isPending || assistantsPending || mePending || !agent) return <DetailSkeleton />;
  return <PracticeStartContent key={agent.id} agent={agent} assistants={assistants ?? []} keepRecordingsDefault={me?.keep_recordings ?? true} />;
};

interface PracticeStartContentProps {
  agent: PracticeAgent;
  assistants: AssistantAgent[];
  keepRecordingsDefault: boolean;
}

function PracticeStartContent({ agent, assistants, keepRecordingsDefault }: PracticeStartContentProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const start = useStartPracticeCall();

  const [copilotEnabled, setCopilotEnabled] = useState(true);
  const [assistantId, setAssistantId] = useState<string>(
    () => searchParams.get("copilot") ?? agent.linked_assistant_agent_id ?? assistants.find((a) => a.is_default)?.id ?? assistants[0]?.id ?? "",
  );
  const [provider, setProvider] = useState<VoiceProvider>(agent.voice_provider);
  const [voice, setVoice] = useState(agent.voice);
  const [keepRecording, setKeepRecording] = useState(keepRecordingsDefault);
  const [showTranscript, setShowTranscript] = useState(true);

  const difficulty = DifficultyFormOptions.find((option) => option.id === agent.difficulty);
  const noAssistants = !assistants.length;

  const begin = () =>
    start.mutate(
      {
        practice_agent_id: agent.id,
        copilot_enabled: copilotEnabled && !noAssistants,
        assistant_agent_id: copilotEnabled && assistantId ? assistantId : undefined,
        voice_provider: provider,
        voice: voice || undefined,
        keep_recording: keepRecording,
      },
      { onSuccess: (call) => navigate(Routes.practice.session(call.id), { state: { showTranscript } }) },
    );

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to={Routes.practice.root}>
          <ArrowLeft /> Practice
        </Link>
      </Button>
      <PageHeader
        eyebrow={getScenarioTypeLabel(agent.scenario_type)}
        title={agent.name}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={Routes.practice.agent(agent.id)}>
              <Pencil /> Edit prospect
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Info className="size-4 text-primary" /> Briefing
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Only what you'd realistically know before the call. Hidden details are revealed afterwards.</p>
          <p className="mt-4 text-[15px] leading-relaxed">{agent.briefing || agent.role_prompt}</p>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {agent.prospect_name && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <dd>
                  {agent.prospect_name}
                  {agent.job_title && <span className="text-muted-foreground"> · {agent.job_title}</span>}
                </dd>
              </div>
            )}
            {agent.company && (
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <dd>{agent.company}</dd>
              </div>
            )}
            {agent.user_objective && (
              <div className="flex items-center gap-2 sm:col-span-2">
                <Target className="size-4 text-muted-foreground" />
                <dd>
                  <span className="text-muted-foreground">Your objective:</span> {agent.user_objective}
                </dd>
              </div>
            )}
            {agent.time_limit_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <dd>{agent.time_limit_minutes} minute limit</dd>
              </div>
            )}
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <Badge variant="secondary" title={LeadTemperatureDescriptionOptions[agent.lead_temperature]}>
              {getLeadTemperatureLabel(agent.lead_temperature)} lead
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <DifficultyDots value={agent.difficulty} /> {difficulty?.label}
            </span>
            <span className="text-xs text-muted-foreground">{difficulty?.description}</span>
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="copilot-toggle" className="flex items-center gap-2">
                  <Bot className="size-4" /> Practice with co-pilot
                </Label>
                <p className="text-xs text-muted-foreground">Live suggestions exactly like a real call. The prospect can't hear them.</p>
              </div>
              <Switch id="copilot-toggle" checked={copilotEnabled && !noAssistants} disabled={noAssistants} onCheckedChange={setCopilotEnabled} />
            </div>
            {noAssistants ? (
              <p className="text-xs text-muted-foreground">
                <Link to={Routes.assistant_agents.new} className="text-primary underline-offset-4 hover:underline">
                  Create a co-pilot
                </Link>{" "}
                to practice with live suggestions.
              </p>
            ) : (
              copilotEnabled && (
                <Select value={assistantId} onValueChange={setAssistantId}>
                  <SelectTrigger aria-label="Co-pilot">
                    <SelectValue placeholder="Choose a co-pilot" />
                  </SelectTrigger>
                  <SelectContent>
                    {assistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <Label htmlFor="transcript-toggle" className="flex items-center gap-2">
                {showTranscript ? <Eye className="size-4" /> : <EyeOff className="size-4" />} Show live transcript
              </Label>
              <Switch id="transcript-toggle" checked={showTranscript} onCheckedChange={setShowTranscript} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="recording-toggle">Keep the recording</Label>
              <Switch id="recording-toggle" checked={keepRecording} onCheckedChange={setKeepRecording} />
            </div>
          </Card>
          <MicCheck />
        </div>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 font-semibold">Voice</h2>
        {catalog && <VoicePicker providers={catalog.voice_providers} provider={provider} voice={voice} language={agent.language} onProviderChange={setProvider} onVoiceChange={setVoice} />}
      </Card>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t bg-background/95 backdrop-blur sm:-mx-6">
        <div className="pb-safe flex items-center gap-3 px-4 pt-3 sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">Use headphones for the most realistic experience.</p>
          <Button size="lg" className="ml-auto w-full sm:w-auto" onClick={begin} disabled={start.isPending || (copilotEnabled && !noAssistants && !assistantId)} loading={start.isPending}>
            {!start.isPending && <Phone />} Start the call
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PracticeStartPage;
