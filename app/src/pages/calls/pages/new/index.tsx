import { useEffect, useState, type FC } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, CheckCircle2, Info, Mic, MonitorSmartphone, Phone, ShieldAlert, Upload } from "lucide-react";
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
import { useCalls, useStartLiveCall, useUploadCalls, type UploadBatchItemPatch } from "@/features/calls/hooks/use-calls";
import { AUTO_LANGUAGE, CallKinds, CallPurposes, CallTypes } from "@/features/calls/interfaces/calls.interfaces";
import { LiveCallTypeDescriptionOptions } from "@/config/constants/dropdowns/calls/call-type-form.options";
import { getMicrophoneStream, getTabAudioStream, isTabAudioCaptureSupported, stopStream } from "@/lib/audio/media-capture";
import { setPendingCapture } from "@/lib/audio/pending-capture";
import { formatShortDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { NO_COPILOT, newCallSchema, type NewCallFormValues } from "../../validation-schemas/new-call.schema";
import { AudioDropzone, type UploadItem } from "./components/audio-dropzone";

const TYPE_ICONS = { [CallTypes.MICROPHONE]: Mic, [CallTypes.ONLINE_MEETING]: MonitorSmartphone, [CallTypes.UPLOAD]: Upload } as const;
const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
const MAX_UPLOAD_FILES = 10;
const fileId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
const UPLOAD_EXTENSIONS = /\.(mp3|m4a|mp4|wav|webm|ogg|oga|aac|flac|opus|mpeg|mpga)$/i;

const NewCallPage: FC = () => {
  const { t } = useTranslation("calls");
  const canManageCopilots = usePermissions().can(Permissions.AGENTS_MANAGE);
  usePageMetadata({ title: t("new.title") });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: agents, isPending: agentsPending } = useAssistantAgents({ status: "active" });
  const { data: catalog } = useCatalog();
  const { data: me } = useMe();
  const { data: recentCalls } = useCalls({ kind: CallKinds.LIVE, limit: 30 });
  const startCall = useStartLiveCall();
  const uploadCalls = useUploadCalls();
  const updateMe = useUpdateMe();
  const [capturing, setCapturing] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fileError, setFileError] = useState<string>();
  const meetingSupported = isTabAudioCaptureSupported();

  const form = useForm<NewCallFormValues>({
    resolver: zodResolver(newCallSchema),
    defaultValues: {
      call_type: CallTypes.MICROPHONE,
      purpose: CallPurposes.SALES,
      assistant_agent_id: NO_COPILOT,
      title: "",
      prospect_name: "",
      prospect_company: "",
      prospect_role: "",
      goal: "",
      context_notes: "",
      prior_call_id: "",
      language: "en",
      keep_recording: true,
      clean_transcript: false,
      consent_acknowledged: false,
    },
  });

  const isUpload = form.watch("call_type") === CallTypes.UPLOAD;
  const agentId = form.watch("assistant_agent_id");
  const noCopilot = agentId === NO_COPILOT;
  const selectedAgent = agents?.find((agent) => agent.id === agentId);
  const consentNeeded = !me?.consent_acknowledged_at;
  const agentLanguageCodes = selectedAgent ? (selectedAgent.languages?.length ? selectedAgent.languages : [selectedAgent.language]) : [];
  const languageLabel = (code: string) => catalog?.languages.find((language) => language.code === code)?.name ?? code;

  // No co-pilot by default; a co-pilot is only preselected when the link names one (?agent=).
  useEffect(() => {
    const requested = searchParams.get("agent");
    if (requested && agents?.some((agent) => agent.id === requested)) form.setValue("assistant_agent_id", requested);
  }, [agents, form, searchParams]);

  useEffect(() => {
    if (noCopilot) {
      form.setValue("language", AUTO_LANGUAGE);
      return;
    }
    if (!selectedAgent) return;
    const agentLanguages = selectedAgent.languages?.length ? selectedAgent.languages : [selectedAgent.language];
    form.setValue("language", agentLanguages.length > 1 ? AUTO_LANGUAGE : agentLanguages[0]);
  }, [form, selectedAgent, noCopilot]);

  useEffect(() => {
    if (me) form.setValue("keep_recording", me.keep_recordings);
  }, [form, me]);

  const copilotDto = (id: string) => (id === NO_COPILOT ? { copilot_enabled: false } : { assistant_agent_id: id });

  const patchItem = (id: string, patch: UploadBatchItemPatch) => setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const removeItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
    setFileError(undefined);
  };

  const addFiles = (incoming: File[]) => {
    const problems: string[] = [];
    const next = [...items];
    for (const file of incoming) {
      const id = fileId(file);
      if (next.some((item) => item.id === id)) continue;
      if (!UPLOAD_EXTENSIONS.test(file.name)) {
        problems.push(`${file.name}: ${t("new.upload.unsupported")}`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        problems.push(`${file.name}: ${t("new.upload.tooLarge")}`);
        continue;
      }
      if (next.length >= MAX_UPLOAD_FILES) {
        problems.push(t("new.upload.tooMany", { max: MAX_UPLOAD_FILES }));
        break;
      }
      next.push({ id, file, status: "pending", percent: 0 });
    }
    setItems(next);
    setFileError(problems.length ? problems.join(" · ") : undefined);
  };

  const onSubmit = async (values: NewCallFormValues) => {
    if (consentNeeded && !values.consent_acknowledged) {
      form.setError("consent_acknowledged", { message: t("new.validation.confirmBeforeStarting") });
      return;
    }

    if (values.call_type === CallTypes.UPLOAD) {
      const toUpload = items.filter((item) => item.status !== "done");
      if (!toUpload.length) {
        setFileError(t("new.upload.fileRequired"));
        return;
      }
      setFileError(undefined);
      if (consentNeeded) updateMe.mutate({ consent_acknowledged: true });
      setItems((previous) => previous.map((item) => (item.status === "done" ? item : { ...item, status: "pending", percent: 0, error: undefined })));
      uploadCalls.mutate(
        {
          files: toUpload.map(({ id, file }) => ({ id, file })),
          dto: {
            ...copilotDto(values.assistant_agent_id),
            purpose: values.purpose,
            // One title can't name several recordings; those get generated titles.
            title: toUpload.length === 1 ? values.title.trim() || undefined : undefined,
            prospect_name: values.prospect_name || undefined,
            prospect_company: values.prospect_company || undefined,
            prospect_role: values.prospect_role || undefined,
            goal: values.goal || undefined,
            context_notes: values.context_notes || undefined,
            prior_call_id: values.prior_call_id || undefined,
            keep_recording: values.keep_recording,
            clean_transcript: values.clean_transcript,
            language: values.language,
          },
          onItem: patchItem,
        },
        {
          onSuccess: (results) => {
            const uploaded = results.filter((result) => result.call);
            if (uploaded.length === results.length) {
              const [first] = uploaded;
              navigate(uploaded.length === 1 && first.call ? Routes.library.detail(first.call.id) : Routes.library.root);
              return;
            }
            // Keep only the files that failed so they can be retried.
            setItems((previous) => previous.filter((item) => !uploaded.some((result) => result.id === item.id)));
          },
        },
      );
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
        purpose: values.purpose,
        ...copilotDto(values.assistant_agent_id),
        title: values.title.trim() || undefined,
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
    // Members who can't create co-pilots only see what their coach shared with them (§10.1h, §14).
    return (
      <>
        <PageHeader title={t("new.title")} />
        {canManageCopilots ? (
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
        ) : (
          <EmptyState
            icon={Bot}
            title={t("access:empty.noSharedCopilot")}
            description={t("access:empty.noSharedCopilotCall")}
            action={
              <Button asChild variant="outline">
                <Link to={Routes.practice.root}>{t("access:empty.goPractice")}</Link>
              </Button>
            }
          />
        )}
      </>
    );
  }

  const busy = capturing || startCall.isPending || uploadCalls.isPending;
  const uploadingItem = items.find((item) => item.status === "uploading");
  const finishedItems = items.filter((item) => item.status === "done" || item.status === "error").length;
  const uploadLabel = uploadCalls.isPending
    ? items.length > 1
      ? t("new.upload.batchProgress", { current: Math.min(finishedItems + 1, items.length), total: items.length, percent: uploadingItem?.percent ?? 0 })
      : t("new.upload.uploading", { percent: uploadingItem?.percent ?? 0 })
    : t("new.upload.submit");

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
                <div role="radiogroup" aria-label={t("new.callType")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <FormSection title={t("new.purpose.label")}>
            <FormSelectField control={form.control} name="purpose" label={t("new.purpose.label")} options={[{ id: CallPurposes.SALES, label: t("new.purpose.sales") }, { id: CallPurposes.COLD_CALL, label: t("new.purpose.coldCall") }]} />
            {form.watch("purpose") === CallPurposes.COLD_CALL && <p className="-mt-2 text-xs text-muted-foreground">{t("new.purpose.coldCallHint")}</p>}
          </FormSection>

          <FormSection title={t("new.copilot.title")}>
            <FormSelectField control={form.control} name="assistant_agent_id" label={t("new.copilot.agentLabel")} options={[{ id: NO_COPILOT, label: t("new.copilot.none") }, ...agents.map((agent) => ({ id: agent.id, label: agent.is_default ? t("new.copilot.defaultSuffix", { name: agent.name }) : agent.name }))]} />
            {noCopilot && <p className="-mt-2 text-xs text-muted-foreground">{t("new.copilot.noneHint")}</p>}
            {selectedAgent?.call_goal && <p className="-mt-2 text-xs text-muted-foreground">{t("new.copilot.goal", { goal: selectedAgent.call_goal })}</p>}
          </FormSection>

          <FormSection title={t("new.context.title")} description={t("new.context.description")}>
            {!(isUpload && items.length > 1) && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("new.context.callTitle")}</FormLabel>
                    <FormControl>
                      <Input maxLength={200} placeholder={t("new.context.callTitlePlaceholder")} {...field} />
                    </FormControl>
                    <FormDescription>{t("new.context.callTitleHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                      codes={selectedAgent ? agentLanguageCodes : undefined}
                      leadingOptions={noCopilot ? [{ id: AUTO_LANGUAGE, label: t("new.context.autoDetectAny") }] : agentLanguageCodes.length > 1 ? [{ id: AUTO_LANGUAGE, label: t("new.context.autoDetect", { languages: agentLanguageCodes.map(languageLabel).join(", ") }) }] : []}
                    />
                    {agentLanguageCodes.length > 1 && <FormDescription>{t("new.context.autoDetectHint")}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          <FormSection title={isUpload ? t("new.upload.title") : t("new.recording.title")}>
            {isUpload && (
              <>
                <AudioDropzone items={items} onAdd={addFiles} onRemove={removeItem} max={MAX_UPLOAD_FILES} disabled={busy} error={fileError} />
                {items.length > 1 && <p className="text-xs text-muted-foreground">{t("new.upload.batchHint")}</p>}
              </>
            )}
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
            {isUpload && (
              <FormField
                control={form.control}
                name="clean_transcript"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <FormLabel>{t("new.upload.cleanup")}</FormLabel>
                        <FormDescription>{t("new.upload.cleanupHint")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={busy} />
                      </FormControl>
                    </div>
                    <div role="note" className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                      <Info className="mt-0.5 size-3.5 shrink-0" />
                      <p>{t("new.upload.cleanupDisclaimer")}</p>
                    </div>
                  </FormItem>
                )}
              />
            )}
            {!isUpload && <MicCheck />}
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
              <p className="hidden text-xs text-muted-foreground sm:block">{isUpload ? t("new.upload.footer") : form.watch("call_type") === CallTypes.ONLINE_MEETING ? t("new.footerMeeting") : t("new.footerMic")}</p>
              <Button type="submit" size="lg" className="ml-auto w-full sm:w-auto" disabled={busy} loading={busy}>
                {!busy && (isUpload ? <Upload /> : <Phone />)} {isUpload ? uploadLabel : t("new.startCall")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewCallPage;
