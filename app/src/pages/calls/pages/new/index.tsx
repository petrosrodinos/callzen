import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("calls");
  usePageMetadata({ title: t("new.title") });
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
      form.setError("consent_acknowledged", { message: t("new.validation.confirmBeforeStarting") });
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
      toast({ title: t("new.audioCaptureFailed"), description: (error as Error).message, variant: "error" });
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
        <PageHeader title={t("new.title")} />
        <EmptyState
          icon={Bot}
          title={t("new.noCopilot.title")}
          description={t("new.noCopilot.description")}
          action={
            <Button asChild>
              <Link to={Routes.assistant_agents.new}>{t("new.noCopilot.cta")}</Link>
            </Button>
          }
        />
      </>
    );
  }

  const busy = capturing || startCall.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("new.title")} description={t("new.description")} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="call_type"
            render={({ field }) => (
              <FormItem>
                <div role="radiogroup" aria-label={t("new.callType")} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                          <span className="mt-1 block text-xs text-muted-foreground">{disabled ? t("new.meetingUnsupported") : option.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )}
          />

          <FormSection title={t("new.copilot.title")}>
            <FormSelectField control={form.control} name="assistant_agent_id" label={t("new.copilot.agentLabel")} options={agents.map((agent) => ({ id: agent.id, label: agent.is_default ? t("new.copilot.defaultSuffix", { name: agent.name }) : agent.name }))} />
            {selectedAgent?.call_goal && <p className="-mt-2 text-xs text-muted-foreground">{t("new.copilot.goal", { goal: selectedAgent.call_goal })}</p>}
          </FormSection>

          <FormSection title={t("new.context.title")} description={t("new.context.description")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(
                [
                  ["prospect_name", t("new.context.prospectName"), t("new.context.prospectNamePlaceholder")],
                  ["prospect_company", t("new.context.company"), t("new.context.companyPlaceholder")],
                  ["prospect_role", t("new.context.role"), t("new.context.rolePlaceholder")],
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
                  <FormLabel>{t("new.context.goal")}</FormLabel>
                  <FormControl>
                    <Input placeholder={selectedAgent?.call_goal ?? t("new.context.goalPlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>{t("new.context.goalHint")}</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="context_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("new.context.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t("new.context.notesPlaceholder")} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormSelectField
                control={form.control}
                name="prior_call_id"
                label={t("new.context.priorCall")}
                allowEmpty
                emptyLabel={t("new.context.none")}
                options={(recentCalls?.data ?? []).map((call) => ({ id: call.id, label: `${call.title ?? call.prospect_name ?? t("new.context.callFallback")} · ${formatShortDate(call.started_at)}` }))}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("new.context.language")}</FormLabel>
                    <LanguageSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      ariaLabel={t("new.context.language")}
                      codes={agentLanguageCodes}
                      leadingOptions={agentLanguageCodes.length > 1 ? [{ id: AUTO_LANGUAGE, label: t("new.context.autoDetect", { languages: agentLanguageCodes.map(languageLabel).join(", ") }) }] : []}
                    />
                    {agentLanguageCodes.length > 1 && <FormDescription>{t("new.context.autoDetectHint")}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title={t("new.recording.title")}>
            <FormField
              control={form.control}
              name="keep_recording"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel>{t("new.recording.keep")}</FormLabel>
                    <FormDescription>{t("new.recording.keepHint")}</FormDescription>
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
              <AlertTitle>{t("new.consent.title")}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{t("new.consent.text")}</p>
                <FormField
                  control={form.control}
                  name="consent_acknowledged"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-normal leading-snug text-foreground">{t("new.consent.checkbox")}</FormLabel>
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
              <p className="hidden text-xs text-muted-foreground sm:block">{form.watch("call_type") === CallTypes.ONLINE_MEETING ? t("new.footerMeeting") : t("new.footerMic")}</p>
              <Button type="submit" size="lg" className="ml-auto w-full sm:w-auto" disabled={busy} loading={busy}>
                {!busy && <Phone />} {t("new.startCall")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewCallPage;
