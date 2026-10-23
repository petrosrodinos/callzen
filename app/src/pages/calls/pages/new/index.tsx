import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, CheckCircle2, Mic, MonitorSmartphone, Phone, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSkeleton } from "@/components/ui/page-skeletons";
import { FormSection } from "@/components/ui/form-section";
import { FormSelectField } from "@/components/ui/form-select-field";
import { LanguageSelect } from "@/components/ui/language-select";
import { MicCheck } from "@/components/ui/live-assist/mic-check";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useMe, useUpdateMe } from "@/features/user/hooks/use-user";
import { useCalls, useStartLiveCall } from "@/features/calls/hooks/use-calls";
import { AUTO_LANGUAGE, CallKinds, CallTypes } from "@/features/calls/interfaces/calls.interfaces";
import { LiveCallTypeDescriptionOptions } from "@/config/constants/dropdowns/calls/call-type-form.options";
import { getMicrophoneStream, getTabAudioStream, isTabAudioCaptureSupported, stopStream } from "@/lib/audio/media-capture";
import { setPendingCapture } from "@/lib/audio/pending-capture";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { newCallSchema, type NewCallFormValues } from "../../validation-schemas/new-call.schema";

const TYPE_ICONS = { [CallTypes.MICROPHONE]: Mic, [CallTypes.ONLINE_MEETING]: MonitorSmartphone } as const;

const NewCallPage: FC = () => {
  usePageMetadata({ title: "Start a call" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: agents, isPending: agentsPending } = useAssistantAgents({ status: "active" });
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const { data: recentCalls } = useCalls({ kind: CallKinds.LIVE, limit: 30 });
  const startCall = useStartLiveCall();
  const updateMe = useUpdateMe();
  const [capturing, setCapturing] = useState(false);
  const meetingSupported = isTabAudioCaptureSupported();

  const form = useForm<NewCallFormValues>({
    resolver: zodResolver(newCallSchema),
    defaultValues: {
      call_type: CallTypes.MICROPHONE,
      assistant_agent_id: "",
      prospect_name: "",
      prospect_company: "",
      prospect_role: "",
      goal: "",
      context_notes: "",
      prior_call_id: "",
      language: "en",
      keep_recording: true,
      consent_acknowledged: false,
    },
  });

  const agentId = form.watch("assistant_agent_id");
  const selectedAgent = agents?.find((agent) => agent.id === agentId);
  const consentNeeded = !me?.consent_acknowledged_at;
  const agentLanguageCodes = selectedAgent ? (selectedAgent.languages?.length ? selectedAgent.languages : [selectedAgent.language]) : [];
  const languageLabel = (code: string) => catalog?.languages.find((language) => language.code === code)?.name ?? code;

  useEffect(() => {
    if (!agents?.length || form.getValues("assistant_agent_id")) return;
    const preferred = searchParams.get("agent") ?? agents.find((a) => a.is_default)?.id ?? agents[0].id;
    form.setValue("assistant_agent_id", preferred);
  }, [agents, form, searchParams]);

  useEffect(() => {
    if (!selectedAgent) return;
    const agentLanguages = selectedAgent.languages?.length ? selectedAgent.languages : [selectedAgent.language];
    form.setValue("language", agentLanguages.length > 1 ? AUTO_LANGUAGE : agentLanguages[0]);
  }, [form, selectedAgent]);

  useEffect(() => {
    if (me) form.setValue("keep_recording", me.keep_recordings);
  }, [form, me]);

  const onSubmit = async (values: NewCallFormValues) => {
    if (consentNeeded && !values.consent_acknowledged) {
      form.setError("consent_acknowledged", { message: "Please confirm before starting" });
      return;
    }

    setCapturing(true);
    let microphone: MediaStream | null = null;
    let remote: MediaStream | null = null;
    try {
      // Ask for the meeting tab first: it needs the click's user activation.
      if (values.call_type === CallTypes.ONLINE_MEETING) remote = await getTabAudioStream();
      microphone = await getMicrophoneStream();
    } catch (error) {
      stopStream(remote);
      stopStream(microphone);
      setCapturing(false);
      toast({ title: "Audio capture failed", description: (error as Error).message, variant: "error" });
      return;
    }

    if (consentNeeded) updateMe.mutate({ consent_acknowledged: true });

    startCall.mutate(
      {
        call_type: values.call_type,
        assistant_agent_id: values.assistant_agent_id,
        prospect_name: values.prospect_name || undefined,
        prospect_company: values.prospect_company || undefined,
        prospect_role: values.prospect_role || undefined,
        goal: values.goal || undefined,
        context_notes: values.context_notes || undefined,
        prior_call_id: values.prior_call_id || undefined,
        keep_recording: values.keep_recording,
        language: values.language,
      },
      {
        onSuccess: (call) => {
          setPendingCapture({ callId: call.id, microphone: microphone as MediaStream, remote });
          navigate(Routes.calls.live(call.id));
        },
        onError: () => {
          stopStream(remote);
          stopStream(microphone);
        },
        onSettled: () => setCapturing(false),
      },
    );
  };

  if (agentsPending) return <FormSkeleton />;

  if (!agents?.length) {
    return (
      <>
        <PageHeader title="Start a call" />
        <EmptyState
          icon={Bot}
          title="Create a co-pilot first"
          description="The co-pilot uses your script, objections and knowledge to suggest what to say. It takes a minute with a template."
          action={
            <Button asChild>
              <Link to={Routes.assistant_agents.new}>Create co-pilot</Link>
            </Button>
          }
        />
      </>
    );
  }

  const busy = capturing || startCall.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Start a call" description="Pick how you're calling and which co-pilot to use. Everything except the co-pilot is optional." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="call_type"
            render={({ field }) => (
              <FormItem>
                <div role="radiogroup" aria-label="Call type" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {LiveCallTypeDescriptionOptions.map((option) => {
                    const Icon = TYPE_ICONS[option.id as keyof typeof TYPE_ICONS];
                    const disabled = option.id === CallTypes.ONLINE_MEETING && !meetingSupported;
                    const selected = field.value === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => field.onChange(option.id)}
                        className={cn("flex gap-3 rounded-xl border p-4 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50", selected && "border-primary bg-primary/5 ring-1 ring-primary")}
                      >
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="flex items-center gap-2 font-medium">
                            {option.label} {selected && <CheckCircle2 className="size-4 text-primary" />}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">{disabled ? "Needs a desktop browser like Chrome or Edge." : option.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )}
          />

          <FormSection title="Co-pilot">
            <FormSelectField control={form.control} name="assistant_agent_id" label="Assistant agent" options={agents.map((agent) => ({ id: agent.id, label: agent.is_default ? `${agent.name} (default)` : agent.name }))} />
            {selectedAgent?.call_goal && <p className="-mt-2 text-xs text-muted-foreground">Goal: {selectedAgent.call_goal}</p>}
          </FormSection>

          <FormSection title="Call context" description="Helps the co-pilot personalise suggestions and the analysis.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(
                [
                  ["prospect_name", "Prospect name", "Dr. Papadopoulos"],
                  ["prospect_company", "Company", "Smile Dental Clinic"],
                  ["prospect_role", "Role", "Clinic owner"],
                ] as const
              ).map(([name, label, placeholder]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input placeholder={placeholder} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal of this call</FormLabel>
                  <FormControl>
                    <Input placeholder={selectedAgent?.call_goal ?? "Book a demo"} {...field} />
                  </FormControl>
                  <FormDescription>Leave empty to use the co-pilot's goal.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="context_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Referred by Anna. Currently uses paper calendars." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelectField
                control={form.control}
                name="prior_call_id"
                label="Previous call with this prospect"
                allowEmpty
                emptyLabel="None"
                options={(recentCalls?.data ?? []).map((call) => ({ id: call.id, label: `${call.title ?? call.prospect_name ?? "Call"} · ${formatShortDate(call.started_at)}` }))}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversation language</FormLabel>
                    <LanguageSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      ariaLabel="Conversation language"
                      codes={agentLanguageCodes}
                      leadingOptions={agentLanguageCodes.length > 1 ? [{ id: AUTO_LANGUAGE, label: `Auto-detect (${agentLanguageCodes.map(languageLabel).join(", ")})` }] : []}
                    />
                    {agentLanguageCodes.length > 1 && <FormDescription>Auto-detect follows whichever of the co-pilot's languages the prospect speaks.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title="Recording">
            <FormField
              control={form.control}
              name="keep_recording"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>Keep the audio recording</FormLabel>
                    <FormDescription>Turn off to get suggestions and an analysis without storing audio.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <MicCheck />
          </FormSection>

          {consentNeeded && (
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <ShieldAlert className="size-4 text-amber-600" />
              <AlertTitle>Recording consent</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Recording laws differ by country and some require every participant's consent. You're responsible for getting it. You can enable a consent line your co-pilot suggests at the start of each call.</p>
                <FormField
                  control={form.control}
                  name="consent_acknowledged"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-normal leading-snug text-foreground">I understand and will get consent where it's required.</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </AlertDescription>
            </Alert>
          )}

          <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 backdrop-blur sm:-mx-6">
            <div className="pb-safe flex items-center gap-3 px-4 pt-3 sm:px-6">
              <p className="hidden text-xs text-muted-foreground sm:block">{form.watch("call_type") === CallTypes.ONLINE_MEETING ? "Next, choose your meeting tab and enable “Share tab audio”." : "Put your phone on speaker near this device."}</p>
              <Button type="submit" size="lg" className="ml-auto w-full sm:w-auto" disabled={busy} loading={busy}>
                {!busy && <Phone />} Start call
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewCallPage;
