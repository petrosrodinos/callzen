import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AudioLines,
  EyeOff,
  Gauge,
  Play,
  Plus,
  Save,
  Target,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { FormSelectField } from "@/components/ui/form-select-field";
import { ScalePicker } from "@/components/ui/scale-picker";
import { LanguageMultiSelect } from "@/components/ui/language-multi-select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import type { AssistantAgent } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import {
  LeadTemperatureDescriptionOptions,
  LeadTemperatureFormOptions,
} from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import {
  DifficultyFormOptions,
  ObjectionPersistenceOptions,
  PatienceFormOptions,
} from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { PersonalityFormOptions } from "@/config/constants/dropdowns/practice/personality-form.options";
import { MoodFormOptions } from "@/config/constants/dropdowns/practice/mood-form.options";
import { DecisionAuthorityFormOptions } from "@/config/constants/dropdowns/practice/decision-authority-form.options";
import { BudgetFormOptions } from "@/config/constants/dropdowns/practice/budget-form.options";
import { TimelineFormOptions } from "@/config/constants/dropdowns/practice/timeline-form.options";
import { ScenarioTypeFormOptions } from "@/config/constants/dropdowns/practice/scenario-type-form.options";
import {
  practiceAgentSchema,
  type PracticeAgentFormValues,
} from "../../../validation-schemas/practice-agent.schema";
import { StringListField } from "../../../components/string-list-field";
import { VoicePicker } from "../../../components/voice-picker";

interface PracticeAgentFormProps {
  defaultValues: PracticeAgentFormValues;
  catalog: Catalog;
  assistantAgents: AssistantAgent[];
  isSaving: boolean;
  isNew: boolean;
  onSubmit: (values: PracticeAgentFormValues, startAfter: boolean) => void;
}

const NONE = "__none__";

type FieldName = keyof PracticeAgentFormValues;

// Which form fields live on which tab, used to jump to the tab with a validation error.
const TABS: {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  fields: FieldName[];
}[] = [
  {
    id: "scenario",
    labelKey: "form.tabs.scenario",
    icon: Target,
    fields: [
      "name",
      "role_prompt",
      "scenario_type",
      "user_objective",
      "scenario_context",
      "selling_product",
      "linked_assistant_agent_id",
    ],
  },
  {
    id: "behaviour",
    labelKey: "form.tabs.behaviour",
    icon: Gauge,
    fields: [
      "lead_temperature",
      "difficulty",
      "patience",
      "personality",
      "mood",
      "decision_authority",
      "budget",
      "timeline",
      "communication_style",
      "current_solution",
    ],
  },
  {
    id: "hidden",
    labelKey: "form.tabs.hidden",
    icon: EyeOff,
    fields: [
      "pain_points",
      "objections",
      "hidden_information",
      "conversion_conditions",
    ],
  },
  {
    id: "identity",
    labelKey: "form.tabs.identity",
    icon: UserRound,
    fields: [
      "prospect_name",
      "job_title",
      "company",
      "industry",
      "age_range",
      "accent",
      "time_limit_minutes",
      "languages",
      "background_story",
      "briefing",
    ],
  },
  {
    id: "voice",
    labelKey: "form.tabs.voice",
    icon: AudioLines,
    fields: ["voice_provider", "voice"],
  },
];

export function PracticeAgentForm({
  defaultValues,
  catalog,
  assistantAgents,
  isSaving,
  isNew,
  onSubmit,
}: PracticeAgentFormProps) {
  const { t } = useTranslation("practice");
  const form = useForm<PracticeAgentFormValues>({
    resolver: zodResolver(practiceAgentSchema),
    defaultValues,
  });
  const objections = useFieldArray({
    control: form.control,
    name: "objections",
  });
  const [provider, voice, languages] = form.watch([
    "voice_provider",
    "voice",
    "languages",
  ]);
  const language = languages[0] ?? "en";

  const [tab, setTab] = useState<string>(TABS[0].id);

  // Hidden tabs unmount their fields, so surface the first tab that has an error.
  const showFirstTabWithError = (
    errors: FieldErrors<PracticeAgentFormValues>,
  ) => {
    const failing = TABS.find((item) =>
      item.fields.some((name) => name in errors),
    );
    if (failing) setTab(failing.id);
  };

  const submit = (startAfter: boolean) =>
    form.handleSubmit(
      (values) => onSubmit(values, startAfter),
      (errors) => {
        showFirstTabWithError(errors);
        toast({
          title: t("form.fixFields"),
          variant: "error",
          duration: 2500,
        });
      },
    );

  return (
    <Form {...form}>
      <form onSubmit={submit(false)}>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="gap-1.5">
                  <item.icon className="size-4" /> {t(item.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="mt-5">
            <TabsContent value="scenario" className="mt-0 space-y-4">
              <FormSection
                title={t("form.scenario.sectionTitle")}
                description={t("form.scenario.sectionDescription")}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.scenario.name")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("form.scenario.namePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.scenario.whoLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={t("form.scenario.whoPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSelectField
                    control={form.control}
                    name="scenario_type"
                    label={t("form.scenario.type")}
                    options={ScenarioTypeFormOptions}
                  />
                  <FormField
                    control={form.control}
                    name="user_objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.scenario.objective")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("form.scenario.objectivePlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="scenario_context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.scenario.situation")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder={t("form.scenario.situationPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="selling_product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.scenario.selling")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("form.scenario.sellingPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linked_assistant_agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.scenario.shareContext")}</FormLabel>
                        <Select
                          value={field.value || NONE}
                          onValueChange={(value) =>
                            field.onChange(value === NONE ? "" : value)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>
                              {t("form.scenario.noCopilot")}
                            </SelectItem>
                            {assistantAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t("form.scenario.copilotHint")}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>
            </TabsContent>

            <TabsContent value="behaviour" className="mt-0 space-y-4">
              <FormSection title={t("form.behaviour.hardTitle")}>
                <FormField
                  control={form.control}
                  name="lead_temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.behaviour.leadTemperature")}</FormLabel>
                      <div
                        className="grid grid-cols-2 gap-2"
                        role="radiogroup"
                        aria-label={t("form.behaviour.leadTemperature")}
                      >
                        {LeadTemperatureFormOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={field.value === option.id}
                            onClick={() => field.onChange(option.id)}
                            className={cn(
                              "rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
                              field.value === option.id &&
                                "border-primary bg-primary/5 ring-1 ring-primary",
                            )}
                          >
                            <span className="block text-sm font-medium">
                              {option.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {LeadTemperatureDescriptionOptions[option.id]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.behaviour.difficulty")}</FormLabel>
                        <ScalePicker
                          ariaLabel={t("form.behaviour.difficulty")}
                          value={field.value}
                          onChange={field.onChange}
                          options={DifficultyFormOptions}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="patience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.behaviour.patienceLabel")}</FormLabel>
                        <ScalePicker
                          ariaLabel={t("form.behaviour.patience")}
                          value={field.value}
                          onChange={field.onChange}
                          options={PatienceFormOptions.map((o) => ({
                            ...o,
                            description: "",
                          }))}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              <FormSection title={t("form.behaviour.personalityTitle")}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormSelectField
                    control={form.control}
                    name="personality"
                    label={t("form.behaviour.personality")}
                    options={PersonalityFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="mood"
                    label={t("form.behaviour.mood")}
                    options={MoodFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="decision_authority"
                    label={t("form.behaviour.decisionAuthority")}
                    options={DecisionAuthorityFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="budget"
                    label={t("form.behaviour.budget")}
                    options={BudgetFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="timeline"
                    label={t("form.behaviour.timeline")}
                    options={TimelineFormOptions}
                    allowEmpty
                  />
                  <FormField
                    control={form.control}
                    name="communication_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.behaviour.communicationStyle")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("form.behaviour.communicationPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="current_solution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.behaviour.currentSolution")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("form.behaviour.currentSolutionPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="hidden" className="mt-0 space-y-4">
              <FormSection
                title={t("form.hidden.title")}
                description={
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="size-3.5" /> {t("form.hidden.description")}
                  </span>
                }
              >
                <StringListField
                  control={form.control}
                  name="pain_points"
                  label={t("form.hidden.painPoints")}
                  description={t("form.hidden.painPointsDescription")}
                  placeholder={t("form.hidden.painPointsPlaceholder")}
                  addLabel={t("form.hidden.addPainPoint")}
                />
                <div className="space-y-2">
                  <FormLabel>{t("form.hidden.objections")}</FormLabel>
                  <ul className="space-y-2">
                    {objections.fields.map((field, index) => (
                      <li
                        key={field.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-start"
                      >
                        <FormField
                          control={form.control}
                          name={`objections.${index}.text`}
                          render={({ field: textField }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder={t("form.hidden.objectionPlaceholder")}
                                  aria-label={t("form.hidden.objectionN", {
                                    n: index + 1,
                                  })}
                                  {...textField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name={`objections.${index}.persistence`}
                            render={({ field: persistenceField }) => (
                              <FormItem className="w-full sm:w-48">
                                <Select
                                  value={String(persistenceField.value)}
                                  onValueChange={(value) =>
                                    persistenceField.onChange(Number(value))
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger aria-label={t("form.hidden.persistence")}>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ObjectionPersistenceOptions.map(
                                      (option) => (
                                        <SelectItem
                                          key={option.id}
                                          value={String(option.id)}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => objections.remove(index)}
                            aria-label={t("form.hidden.removeObjection")}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      objections.append({ text: "", persistence: 2 })
                    }
                  >
                    <Plus /> {t("form.hidden.addObjection")}
                  </Button>
                </div>
                <StringListField
                  control={form.control}
                  name="hidden_information"
                  label={t("form.hidden.hiddenInfo")}
                  description={t("form.hidden.hiddenInfoDescription")}
                  placeholder={t("form.hidden.hiddenInfoPlaceholder")}
                  addLabel={t("form.hidden.addHiddenFact")}
                />
                <StringListField
                  control={form.control}
                  name="conversion_conditions"
                  label={t("form.hidden.conditions")}
                  description={t("form.hidden.conditionsDescription")}
                  placeholder={t("form.hidden.conditionsPlaceholder")}
                  addLabel={t("form.hidden.addCondition")}
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="identity" className="mt-0 space-y-4">
              <FormSection
                title={t("form.identity.title")}
                description={t("form.identity.description")}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["prospect_name", "prospectName"],
                      ["job_title", "jobTitle"],
                      ["company", "company"],
                      ["industry", "industry"],
                      ["age_range", "ageRange"],
                      ["accent", "accent"],
                    ] as const
                  ).map(([name, key]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(`form.identity.${key}`)}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t(`form.identity.${key}Placeholder`)}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="time_limit_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.identity.timeLimit")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            placeholder={t("form.identity.noLimit")}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.identity.languages")}</FormLabel>
                      <LanguageMultiSelect
                        ariaLabel={t("form.identity.languagesAria")}
                        languages={catalog.languages}
                        value={field.value}
                        onChange={field.onChange}
                        max={catalog.max_conversation_languages ?? 5}
                      />
                      <FormDescription>
                        {t("form.identity.languagesHint")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="background_story"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.identity.background")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={t("form.identity.backgroundPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="briefing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.identity.briefing")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder={t("form.identity.briefingPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("form.identity.briefingHint")}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="voice" className="mt-0 space-y-4">
              <FormSection
                title={t("form.voice.title")}
                description={t("form.voice.description")}
              >
                <VoicePicker
                  providers={catalog.voice_providers}
                  provider={provider}
                  voice={voice}
                  language={language}
                  onProviderChange={(value) =>
                    form.setValue("voice_provider", value, {
                      shouldDirty: true,
                    })
                  }
                  onVoiceChange={(value) =>
                    form.setValue("voice", value, { shouldDirty: true })
                  }
                />
              </FormSection>
            </TabsContent>
          </div>
        </Tabs>

        <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/95 backdrop-blur sm:-mx-6">
          <div className="pb-safe flex items-center justify-end gap-2 px-4 pt-3 sm:px-6">
            <Button type="submit" variant="outline" disabled={isSaving}>
              <Save /> {isNew ? t("form.save") : t("form.saveChanges")}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              loading={isSaving}
              onClick={() => void submit(true)()}
            >
              {!isSaving && <Play />} {t("form.saveAndPractice")}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
